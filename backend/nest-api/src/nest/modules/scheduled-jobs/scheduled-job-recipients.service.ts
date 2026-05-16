import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { SCHEDULED_JOB_DEFINITIONS } from './scheduled-jobs.definitions';
import {
  ScheduledJobNotificationScope,
  ScheduledJobRecipientType,
  ScheduledJobRecipientsRepository,
  UpsertScheduledJobRecipientInput,
} from './scheduled-job-recipients.repository';

export interface ScheduledJobRecipientDto {
  id: number;
  jobId: string;
  recipientType: ScheduledJobRecipientType;
  userId: number | null;
  email: string | null;
  displayName: string | null;
  isSubscribed: boolean;
  isAssignee: boolean;
  notificationScope: ScheduledJobNotificationScope;
  active: boolean;
  resolvedEmail: string | null;
  resolvedName: string | null;
}

export interface UpsertScheduledJobRecipientDto {
  recipientType: ScheduledJobRecipientType;
  userId?: number | null;
  email?: string | null;
  displayName?: string | null;
  isSubscribed?: boolean;
  isAssignee?: boolean;
  notificationScope?: ScheduledJobNotificationScope;
  active?: boolean;
}

interface UnsubscribeTokenPayload {
  jobId: string;
  email: string;
  exp: number;
}

@Injectable()
export class ScheduledJobRecipientsService {
  private readonly unsubscribeTokenSecret: string;
  private readonly unsubscribeTtlSeconds: number;

  constructor(
    private readonly repository: ScheduledJobRecipientsRepository,
    private readonly configService: ConfigService,
  ) {
    this.unsubscribeTokenSecret =
      this.configService.get<string>('APP_SECRET_KEY') ||
      this.configService.get<string>('JWT_SECRET') ||
      'scheduled-job-unsubscribe-secret';
    this.unsubscribeTtlSeconds = Number(
      this.configService.get<string>('SCHEDULED_JOB_UNSUBSCRIBE_TTL_SECONDS') || 60 * 60 * 24 * 30,
    );
  }

  async list(jobId: string): Promise<ScheduledJobRecipientDto[]> {
    this.assertCanManageRecipients(jobId);
    const rows = await this.repository.listByJobId(jobId);
    return rows.map((row) => ({
      id: row.id,
      jobId: row.job_id,
      recipientType: row.recipient_type,
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      isSubscribed: row.is_subscribed === 1,
      isAssignee: row.is_assignee === 1,
      notificationScope: row.notification_scope,
      active: row.active === 1,
      resolvedEmail: row.resolved_email,
      resolvedName: row.resolved_name,
    }));
  }

  async replace(jobId: string, recipients: UpsertScheduledJobRecipientDto[]): Promise<ScheduledJobRecipientDto[]> {
    this.assertCanManageRecipients(jobId);
    if (!Array.isArray(recipients)) {
      throw new BadRequestException('recipients must be an array');
    }

    const normalized = recipients.map((recipient, index) => this.normalizeRecipient(recipient, index));

    await this.repository.replaceByJobId(jobId, normalized);
    return this.list(jobId);
  }

  async resolveSubscribedEmails(jobId: string): Promise<string[]> {
    const rows = await this.repository.listByJobId(jobId);
    const uniqueEmails = new Set<string>();

    for (const row of rows) {
      const recipientRowActive = row.active === 1;
      const recipientRowSubscribed = row.is_subscribed === 1;
      if (!recipientRowActive || !recipientRowSubscribed) {
        continue;
      }

      if (row.recipient_type === 'internal_user' && row.resolved_user_active !== 1) {
        continue;
      }

      const email = String(row.resolved_email ?? '').trim().toLowerCase();
      if (!this.isValidEmail(email)) {
        continue;
      }

      uniqueEmails.add(email);
    }

    return [...uniqueEmails];
  }

  createUnsubscribeToken(jobId: string, email: string): string {
    this.assertCanManageRecipients(jobId);
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!this.isValidEmail(normalizedEmail)) {
      throw new BadRequestException('Invalid email for unsubscribe token');
    }

    const payload: UnsubscribeTokenPayload = {
      jobId,
      email: normalizedEmail,
      exp: Math.floor(Date.now() / 1000) + this.unsubscribeTtlSeconds,
    };

    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  async unsubscribeWithToken(token: string): Promise<{ jobId: string; email: string; affectedRows: number }> {
    const payload = this.verifyUnsubscribeToken(token);
    const affectedRows = await this.repository.unsubscribeByJobAndEmail(payload.jobId, payload.email);
    return {
      jobId: payload.jobId,
      email: payload.email,
      affectedRows,
    };
  }

  private normalizeRecipient(
    recipient: UpsertScheduledJobRecipientDto,
    index: number,
  ): UpsertScheduledJobRecipientInput {
    if (!recipient || typeof recipient !== 'object') {
      throw new BadRequestException(`Recipient at index ${index} is invalid`);
    }

    if (recipient.recipientType !== 'internal_user' && recipient.recipientType !== 'external_email') {
      throw new BadRequestException(`Recipient at index ${index} must have recipientType 'internal_user' or 'external_email'`);
    }

    if (recipient.recipientType === 'internal_user') {
      if (!Number.isInteger(recipient.userId) || Number(recipient.userId) <= 0) {
        throw new BadRequestException(`Recipient at index ${index} must include a valid userId`);
      }

      return {
        recipientType: 'internal_user',
        userId: Number(recipient.userId),
        email: null,
        displayName: this.normalizeDisplayName(recipient.displayName),
        isSubscribed: recipient.isSubscribed !== false,
        isAssignee: recipient.isAssignee === true,
        notificationScope: this.normalizeNotificationScope(recipient.notificationScope),
        active: recipient.active !== false,
      };
    }

    const email = String(recipient.email ?? '').trim().toLowerCase();
    if (!this.isValidEmail(email)) {
      throw new BadRequestException(`Recipient at index ${index} must include a valid email`);
    }

    return {
      recipientType: 'external_email',
      userId: null,
      email,
      displayName: this.normalizeDisplayName(recipient.displayName),
      isSubscribed: recipient.isSubscribed !== false,
      isAssignee: recipient.isAssignee === true,
      notificationScope: this.normalizeNotificationScope(recipient.notificationScope),
      active: recipient.active !== false,
    };
  }

  private normalizeNotificationScope(scope?: ScheduledJobNotificationScope): ScheduledJobNotificationScope {
    return scope === 'on_failure' ? 'on_failure' : 'always';
  }

  private normalizeDisplayName(value?: string | null): string | null {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }

  private assertCanManageRecipients(jobId: string): void {
    const job = SCHEDULED_JOB_DEFINITIONS.find((row) => row.id === jobId);
    if (!job) {
      throw new BadRequestException(`Scheduled job not found: ${jobId}`);
    }

    if (job.supportsRecipients === false) {
      throw new BadRequestException(`Scheduled job does not support recipient subscriptions: ${jobId}`);
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private verifyUnsubscribeToken(token: string): UnsubscribeTokenPayload {
    const [encodedPayload, signature] = String(token || '').split('.');
    if (!encodedPayload || !signature) {
      throw new BadRequestException('Invalid unsubscribe token');
    }

    const expectedSignature = this.sign(encodedPayload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('Invalid unsubscribe token signature');
    }

    let payload: UnsubscribeTokenPayload;
    try {
      payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as UnsubscribeTokenPayload;
    } catch {
      throw new BadRequestException('Invalid unsubscribe token payload');
    }

    if (!payload?.jobId || !payload?.email || !payload?.exp) {
      throw new BadRequestException('Invalid unsubscribe token payload');
    }

    this.assertCanManageRecipients(payload.jobId);
    if (!this.isValidEmail(String(payload.email).toLowerCase())) {
      throw new BadRequestException('Invalid unsubscribe token email');
    }

    const now = Math.floor(Date.now() / 1000);
    if (Number(payload.exp) < now) {
      throw new BadRequestException('Unsubscribe token has expired');
    }

    return {
      jobId: String(payload.jobId),
      email: String(payload.email).toLowerCase(),
      exp: Number(payload.exp),
    };
  }

  private sign(value: string): string {
    return createHmac('sha256', this.unsubscribeTokenSecret)
      .update(value)
      .digest('base64url');
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private base64UrlDecode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8');
  }
}

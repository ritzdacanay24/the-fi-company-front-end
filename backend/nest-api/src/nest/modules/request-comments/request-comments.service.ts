import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';
import { EmailNotificationsService } from '../email-notifications';
import { RequestCommentsRepository } from './request-comments.repository';

@Injectable()
export class RequestCommentsService {
  private readonly logger = new Logger(RequestCommentsService.name);

  constructor(
    private readonly repository: RequestCommentsRepository,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly urlBuilder: UrlBuilder,
    private readonly emailNotificationsService: EmailNotificationsService,
  ) {}

  async getAll() {
    return this.repository.find();
  }

  async getByRequestId(fsRequestId: number) {
    return this.repository.getByRequestId(fsRequestId);
  }

  async createComment(token: string | undefined, toEmail: string | undefined, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);

    if (toEmail && !sanitized.email) {
      sanitized.email = toEmail;
    }

    if (!sanitized.created_date) {
      sanitized.created_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    const created = await this.repository.findOne({ id: insertId });
    await this.sendCommentNotification(created || sanitized, toEmail, token);
    return created;
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);

    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Request comment ${id} not found`);
    }

    return this.repository.findOne({ id });
  }

  private async sendCommentNotification(
    commentData: Record<string, unknown>,
    toEmail?: string,
    token?: string,
  ): Promise<void> {
    try {
      const configuredRecipients = await this.emailNotificationsService.getRecipients(
        'field_service_comment_notification_request_form',
      );
      const fallbackRecipients = this.parseRecipients(toEmail);
      const recipients = configuredRecipients.length > 0 ? configuredRecipients : fallbackRecipients;

      if (recipients.length === 0) {
        this.logger.warn(
          '[email] No field_service_comment_notification_request_form recipients configured; skipping comment notification',
        );
        return;
      }

      const numericRequestId = Number(commentData.fs_request_id || 0);
      const requestContext =
        Number.isFinite(numericRequestId) && numericRequestId > 0
          ? await this.repository.getRequestEmailContext(numericRequestId)
          : null;

      const requestId = String(commentData.fs_request_id || '').trim();
      const createdBy = String(commentData.name || '').trim();
      const subject =
        String(requestContext?.subject || '').trim() ||
        String(commentData.subject || '').trim() ||
        `Field Service Request Comment${requestId ? ` - Request #${requestId}` : ''}`;
      const comment = String(commentData.comment || '').trim();
      const requestChange =
        String(commentData.request_change ?? '').trim() === '1' ||
        String(commentData.request_change ?? '').trim().toLowerCase() === 'true';
      const callbackLink = String(commentData.emailCallBackUrl || '').trim();
      const requestToken = String(token || requestContext?.token || '').trim();
      const customerLink = callbackLink || (requestToken
        ? this.withQuery('/request', { token: requestToken, viewComment: 1 })
        : '');
      const internalLink =
        (Number.isFinite(numericRequestId) && numericRequestId > 0
          ? this.urlBuilder.fieldService.requestEdit(numericRequestId)
          : '');
      const type = String(commentData.type || 'Field Service Request').trim();

      await this.emailService.sendMail({
        to: recipients,
        subject,
        html: this.emailTemplateService.render('field-service-request-comment', {
          requestId,
          createdBy,
          comment,
          requestChange,
          customerLink,
          internalLink,
          type,
          requestDate: String(requestContext?.date_of_service || '').trim(),
          requestTime: String(requestContext?.start_time || '').trim(),
          customerCo: String(requestContext?.customer_co_number || '').trim(),
          soNumber: String(requestContext?.so_number || '').trim(),
          property: String(requestContext?.property || '').trim(),
          state: String(requestContext?.state || '').trim(),
          city: String(requestContext?.city || '').trim(),
        }),
      });
    } catch (error) {
      this.logger.warn(
        `Field service request comment email failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private parseRecipients(value?: string): string[] {
    return String(value || '')
      .split(/[;,]/)
      .map((email) => email.trim())
      .filter(Boolean);
  }

  private withQuery(
    path: string,
    query: Record<string, string | number | boolean | undefined>,
  ): string {
    const base = String(this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL')).replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${base}${normalizedPath}`);

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }

      url.searchParams.set(key, String(value));
    }

    return url.toString();
  }
}

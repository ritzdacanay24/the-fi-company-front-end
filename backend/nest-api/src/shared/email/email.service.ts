import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';

interface ScheduledJobMailOptions extends SendMailOptions {
  scheduledJobId?: string;
}

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly isDevelopment: boolean;
  private readonly defaultFrom: string;
  private readonly devEmailRerouteTo: string;
  private readonly mailTransport: 'smtp' | 'sendmail';
  private readonly dashboardWebBaseUrl: string;
  private readonly unsubscribeTokenSecret: string;
  private readonly unsubscribeTtlSeconds: number;
  private testModeRedirectTo?: string;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.getOrThrow<string>('NODE_ENV').toLowerCase();
    this.isDevelopment = nodeEnv === 'development';
    console.log(`EmailService initialized in ${this.isDevelopment }`);
    this.defaultFrom = this.configService.getOrThrow<string>('MAIL_FROM');
    this.devEmailRerouteTo = this.configService.getOrThrow<string>('DEV_EMAIL_REROUTE_TO');
    this.mailTransport = this.configService.get<'smtp' | 'sendmail'>('MAIL_TRANSPORT') ?? 'smtp';
    this.dashboardWebBaseUrl = String(this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL')).replace(/\/+$/, '');
    this.unsubscribeTokenSecret =
      this.configService.get<string>('APP_SECRET_KEY') ||
      this.configService.get<string>('JWT_SECRET') ||
      'scheduled-job-unsubscribe-secret';
    this.unsubscribeTtlSeconds = Number(
      this.configService.get<string>('SCHEDULED_JOB_UNSUBSCRIBE_TTL_SECONDS') || 60 * 60 * 24 * 30,
    );

    if (this.mailTransport === 'sendmail') {
      const sendmailPath = this.configService.get<string>('SENDMAIL_PATH') ?? '/usr/sbin/sendmail';
      const newline = this.configService.get<'unix' | 'windows'>('SENDMAIL_NEWLINE') ?? 'unix';

      this.transporter = nodemailer.createTransport({
        sendmail: true,
        path: sendmailPath,
        newline,
      });
      return;
    }

    const host = this.configService.getOrThrow<string>('SMTP_HOST');
    const port = this.configService.getOrThrow<number>('SMTP_PORT');
    const secure = this.configService.getOrThrow<boolean>('SMTP_SECURE');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    const connectionTimeout = this.configService.get<number>('SMTP_CONNECTION_TIMEOUT_MS') ?? 10000;
    const greetingTimeout = this.configService.get<number>('SMTP_GREETING_TIMEOUT_MS') ?? 10000;
    const socketTimeout = this.configService.get<number>('SMTP_SOCKET_TIMEOUT_MS') ?? 15000;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      connectionTimeout,
      greetingTimeout,
      socketTimeout,
      auth:
        smtpUser && smtpPassword
          ? {
            user: smtpUser,
            pass: smtpPassword,
          }
          : undefined,
    });
  }

  async sendMail(options: ScheduledJobMailOptions): Promise<void> {
    const payload: ScheduledJobMailOptions = {
      from: options.from || this.defaultFrom,
      bcc: 'ritz.dacanay@the-fi-company.com',
      ...options,
    };


    if (this.isDevelopment) {
      // In dev: redirect ALL emails to DEV_EMAIL_REROUTE_TO only — never send to real recipients
      await this.transporter.sendMail({
        ...payload,
        to: this.devEmailRerouteTo,
        cc: undefined,
        bcc: undefined,
        headers: {
          ...(typeof payload.headers === 'object' && payload.headers ? payload.headers : {}),
          'X-Original-To': this.recipientsToText(options.to),
          'X-Original-Cc': this.recipientsToText(options.cc),
          'X-Original-Bcc': this.recipientsToText(options.bcc),
          'X-Dev-Mode': `true (redirected to: ${this.devEmailRerouteTo})`,
        },
      });
      return;
    }

    if (payload.scheduledJobId && payload.html) {
      const recipients = this.normalizeRecipients(payload.to);
      if (recipients.length > 0) {
        for (const recipient of recipients) {
          await this.transporter.sendMail({
            ...payload,
            to: recipient,
            html: this.appendScheduledJobFooter(
              String(payload.html),
              payload.scheduledJobId,
              recipient,
            ),
          });
        }
        return;
      }
    }

    await this.transporter.sendMail(payload);
  }

  async sendMailDirect(options: SendMailOptions): Promise<void> {
    // Send directly without any dev redirects — used for test confirmations that must go to specific recipient
    const payload: SendMailOptions = {
      from: options.from || this.defaultFrom,
      ...options,
    };

    await this.transporter.sendMail(payload);
  }

  setTestMode(redirectTo: string): void {
    this.testModeRedirectTo = redirectTo;
  }

  clearTestMode(): void {
    this.testModeRedirectTo = undefined;
  }

  private recipientsToText(
    value: SendMailOptions['to'] | SendMailOptions['cc'] | SendMailOptions['bcc'],
  ): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'string' ? entry : entry.address || entry.name || ''))
        .filter(Boolean)
        .join(', ');
    }

    return value.address || value.name || '';
  }

  private normalizeRecipients(value: SendMailOptions['to']): string[] {
    if (!value) {
      return [];
    }

    if (typeof value === 'string') {
      return [value.trim().toLowerCase()].filter(Boolean);
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'string' ? entry : entry.address || ''))
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
    }

    return [String(value.address || '').trim().toLowerCase()].filter(Boolean);
  }

  private appendScheduledJobFooter(html: string, jobId: string, recipientEmail: string): string {
    const token = this.createUnsubscribeToken(jobId, recipientEmail);
    const unsubscribeUrl = `${this.dashboardWebBaseUrl}/apiV2/scheduled-jobs/subscriptions/unsubscribe?token=${encodeURIComponent(token)}`;
    const manageUrl = `${this.dashboardWebBaseUrl}/maintenance/scheduled-jobs/list`;

    const footer = `
      <hr style="margin-top:24px;border:none;border-top:1px solid #d0d7de;" />
      <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:8px 0 0;">
        You are receiving this because you are subscribed to the <strong>${this.escapeHtml(jobId)}</strong> scheduled job.
        <br />
        <a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer">Unsubscribe from this email</a>
        &nbsp;|&nbsp;
        <a href="${manageUrl}" target="_blank" rel="noopener noreferrer">Manage notification preferences</a>
      </p>
    `;

    return `${html}${footer}`;
  }

  private createUnsubscribeToken(jobId: string, email: string): string {
    const payload = {
      jobId,
      email: String(email || '').trim().toLowerCase(),
      exp: Math.floor(Date.now() / 1000) + this.unsubscribeTtlSeconds,
    };

    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = createHmac('sha256', this.unsubscribeTokenSecret)
      .update(encoded)
      .digest('base64url');

    return `${encoded}.${signature}`;
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
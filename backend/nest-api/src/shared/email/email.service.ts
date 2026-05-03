import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly isDevelopment: boolean;
  private readonly defaultFrom: string;
  private readonly devEmailRerouteTo: string;
  private readonly mailTransport: 'smtp' | 'sendmail';
  private testModeRedirectTo?: string;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.getOrThrow<string>('NODE_ENV').toLowerCase();
    this.isDevelopment = nodeEnv === 'development';
    this.defaultFrom = this.configService.getOrThrow<string>('MAIL_FROM');
    this.devEmailRerouteTo = this.configService.getOrThrow<string>('DEV_EMAIL_REROUTE_TO');
    this.mailTransport = this.configService.get<'smtp' | 'sendmail'>('MAIL_TRANSPORT') ?? 'smtp';

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

  async sendMail(options: SendMailOptions): Promise<void> {
    const payload: SendMailOptions = {
      from: options.from || this.defaultFrom,
      bcc: 'ritz.dacanay@the-fi-company.com',
      ...options,
    };

    // Test mode: redirect all emails to testModeRedirectTo
    if (this.testModeRedirectTo) {
      await this.transporter.sendMail({
        ...payload,
        to: this.testModeRedirectTo,
        cc: undefined,
        bcc: undefined,
        headers: {
          ...(typeof payload.headers === 'object' && payload.headers ? payload.headers : {}),
          'X-Original-To': this.recipientsToText(options.to),
          'X-Original-Cc': this.recipientsToText(options.cc),
          'X-Original-Bcc': this.recipientsToText(options.bcc),
          'X-Test-Mode': `true (redirected to: ${this.testModeRedirectTo})`,
        },
      });
      return;
    }

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
}
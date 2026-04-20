import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly isDevelopment: boolean;
  private readonly defaultFrom: string;
  private readonly devEmailRerouteTo: string;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.getOrThrow<string>('NODE_ENV').toLowerCase();
    this.isDevelopment = nodeEnv === 'development';
    this.defaultFrom = this.configService.getOrThrow<string>('MAIL_FROM');
    this.devEmailRerouteTo = this.configService.getOrThrow<string>('DEV_EMAIL_REROUTE_TO');

    const host = this.configService.getOrThrow<string>('SMTP_HOST');
    const port = this.configService.getOrThrow<number>('SMTP_PORT');
    const secure = this.configService.getOrThrow<boolean>('SMTP_SECURE');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
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
      ...options,
    };

    if (this.isDevelopment) {
      await this.transporter.sendMail({
        ...payload,
        to: this.devEmailRerouteTo,
        cc: undefined,
        bcc: undefined,
        headers: {
          ...(typeof payload.headers === 'object' && payload.headers ? payload.headers : {}),
          'X-Original-To': this.recipientsToText(payload.to),
          'X-Original-Cc': this.recipientsToText(payload.cc),
          'X-Original-Bcc': this.recipientsToText(payload.bcc),
        },
      });
      return;
    }

    await this.transporter.sendMail(payload);
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
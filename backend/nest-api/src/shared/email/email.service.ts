import { Injectable } from '@nestjs/common';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;

  constructor() {
    const isDevelopment = String(process.env.NODE_ENV || '').toLowerCase() === 'development';
    const host = process.env.SMTP_HOST || (isDevelopment ? 'mailpit' : 'localhost');
    const port = Number(process.env.SMTP_PORT || (isDevelopment ? 1025 : 25));
    const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASSWORD
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            }
          : undefined,
    });
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    await this.transporter.sendMail(options);
  }
}
import { Injectable } from '@nestjs/common';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT || 25),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
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
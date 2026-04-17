import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { EmailService } from '@/shared/email/email.service';
import { ShippingRequestRepository } from './shipping-request.repository';

@Injectable()
export class ShippingRequestService {
  private readonly logger = new Logger(ShippingRequestService.name);

  constructor(
    private readonly repository: ShippingRequestRepository,
    private readonly emailService: EmailService,
  ) {}

  async getList(query: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll?: boolean;
  }): Promise<RowDataPacket[]> {
    return this.repository.getList({
      selectedViewType: query.selectedViewType,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      isAll: Boolean(query.isAll),
    });
  }

  async find(filters: Record<string, unknown>) {
    return this.repository.find(filters);
  }

  async getAll() {
    return this.repository.getAll();
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_SHIPPING_REQUEST_NOT_FOUND',
        message: `Shipping request with id ${id} not found`,
      });
    }
    return row;
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    await this.sendCreateNotification(insertId);
    return { insertId };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const rowCount = await this.repository.updateById(id, payload);

    const sendTrackingEmail = Boolean(payload.sendTrackingEmail);
    if (sendTrackingEmail) {
      const recipients = String(payload.sendTrackingNumberTo || '');
      const trackingNumber = String(payload.trackingNumber || '');
      await this.sendTrackingNotification(id, recipients, trackingNumber);
    }

    return { rowCount };
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }

  private async sendCreateNotification(id: number) {
    try {
      const recipients = await this.repository.getNotificationRecipients('create_shipping_request');
      if (recipients.length === 0) {
        return;
      }

      const link = `https://dashboard.eye-fi.com/dist/web/operations/forms/shipping-request/edit?id=${id}`;
      await this.emailService.sendMail({
        from: process.env.MAIL_FROM || 'noreply@the-fi-company.com',
        to: recipients,
        cc: ['ritz.dacanay@the-fi-company.com'],
        subject: `Shipping Request Form #${id}`,
        html: `
          <html>
            <body>
              <p>Hello Team,</p>
              <p>A shipping request form was submitted.</p>
              <p>Please click <a href="${link}">here</a> to view the shipping request details.</p>
              <p>----------------------------------------------------</p>
              <p>This is an automated email. Please do not respond.</p>
            </body>
          </html>
        `,
      });
    } catch (error) {
      this.logger.warn(
        `Shipping request create email failed for id ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async sendTrackingNotification(id: number, recipientsRaw: string, trackingNumber: string) {
    try {
      const to = recipientsRaw
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);

      if (to.length === 0) {
        return;
      }

      const cc = await this.repository.getNotificationRecipients('tracking_number_notification_shipping_request');
      const link = `https://dashboard.eye-fi.com/dist/web/operations/forms/shipping-request/edit?id=${id}`;

      await this.emailService.sendMail({
        from: process.env.MAIL_FROM || 'noreply@the-fi-company.com',
        to,
        cc,
        subject: `Shipping Request Form #${id}`,
        html: `
          <html>
            <body>
              <p>Hello your shipment has been processed. Your tracking # is ${this.escapeHtml(trackingNumber)}.</p>
              <p>Please click <a href="${link}">here</a> to view the shipping request details.</p>
              <p>Thank you.</p>
              <p>----------------------------------------------------</p>
              <p>This is an automated email. Please do not respond.</p>
            </body>
          </html>
        `,
      });
    } catch (error) {
      this.logger.warn(
        `Shipping request tracking email failed for id ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

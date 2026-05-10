import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RowDataPacket } from 'mysql2';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';
import { ShippingRequestRepository } from './shipping-request.repository';
import { EmailNotificationsService } from '../email-notifications';

@Injectable()
export class ShippingRequestService {
  private readonly logger = new Logger(ShippingRequestService.name);
  private static readonly VALID_STATUSES = ['Open', 'Pending', 'In Transit', 'Completed', 'Cancelled'] as const;

  constructor(
    private readonly repository: ShippingRequestRepository,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
    private readonly urlBuilder: UrlBuilder,
    private readonly emailNotificationsService: EmailNotificationsService,
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
    const explicitStatus = this.normalizeExplicitStatus(payload.status);
    const payloadWithStatus = {
      ...payload,
      status: explicitStatus || this.calculateStatus(payload),
    };

    const insertId = await this.repository.create(payloadWithStatus);
    await this.sendCreateNotification(insertId);
    return { insertId };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    const existing = await this.getById(id);
    const merged = { ...existing, ...payload };
    const explicitStatus = this.normalizeExplicitStatus(payload.status);
    const payloadWithStatus = {
      ...payload,
      status: explicitStatus || this.calculateStatus(merged),
    };

    const rowCount = await this.repository.updateById(id, payloadWithStatus);

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

  private calculateStatus(record: Record<string, unknown>): (typeof ShippingRequestService.VALID_STATUSES)[number] {
    const activeValue = record.active;
    const activeNumber = Number(activeValue);
    const isInactive =
      activeValue === false
      || activeValue === 'false'
      || activeValue === '0'
      || (Number.isFinite(activeNumber) && activeNumber === 0);

    if (isInactive) {
      return 'Cancelled';
    }

    const completedDate = String(record.completedDate ?? '').trim();
    if (completedDate && completedDate.toLowerCase() !== 'n/a') {
      return 'Completed';
    }

    const trackingNumber = String(record.trackingNumber ?? '').trim();
    const normalizedTracking = trackingNumber.toLowerCase();
    if (trackingNumber && !['n/a', 'na', 'null', 'none', '-'].includes(normalizedTracking)) {
      return 'In Transit';
    }

    return 'Open';
  }

  private normalizeExplicitStatus(input: unknown): (typeof ShippingRequestService.VALID_STATUSES)[number] | null {
    const normalized = String(input ?? '').trim();
    if (!normalized) {
      return null;
    }

    if ((ShippingRequestService.VALID_STATUSES as readonly string[]).includes(normalized)) {
      return normalized as (typeof ShippingRequestService.VALID_STATUSES)[number];
    }

    return null;
  }

  private async sendCreateNotification(id: number) {
    try {
      let recipients = await this.emailNotificationsService.getRecipients('create_shipping_request');
      if (recipients.length === 0) {
        recipients = [this.configService.getOrThrow<string>('DEV_EMAIL_REROUTE_TO')];
        this.logger.warn(
          `[email] No active create_shipping_request recipients; using fallback recipient ${recipients[0]}`,
        );
      }

      const link = this.urlBuilder.operations.shippingRequestEdit(id);
      const html = this.emailTemplateService.render('shipping-request-created', { id, link });

      await this.emailService.sendMail({
        to: recipients,
        cc: ['ritz.dacanay@the-fi-company.com'],
        subject: `Shipping Request Form #${id}`,
        html,
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

      const cc = await this.emailNotificationsService.getRecipients(
        'tracking_number_notification_shipping_request',
      );
      const link = this.urlBuilder.operations.shippingRequestEdit(id);
      const html = this.emailTemplateService.render('shipping-request-tracking', {
        id,
        link,
        trackingNumber,
      });

      await this.emailService.sendMail({
        to,
        cc,
        subject: `Shipping Request Form #${id}`,
        html,
      });
    } catch (error) {
      this.logger.warn(
        `Shipping request tracking email failed for id ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

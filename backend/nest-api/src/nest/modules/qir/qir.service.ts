import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';
import { EmailNotificationsService } from '../email-notifications';
import { QirRepository } from './qir.repository';

@Injectable()
export class QirService {
  private readonly logger = new Logger(QirService.name);

  constructor(
    private readonly repository: QirRepository,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
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

  async searchQir(text: string) {
    return this.repository.searchQir(text);
  }

  async find(filters: Record<string, string>) {
    return this.repository.find(filters);
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_QIR_NOT_FOUND',
        message: `QIR with id ${id} not found`,
      });
    }

    return row;
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    await this.repository.updateQirNumber(insertId, insertId);

    await this.sendCreateNotification(insertId, payload);

    return { insertId };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const rowCount = await this.repository.updateById(id, payload);
    return { rowCount };
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }

  private async sendCreateNotification(insertId: number, payload: Record<string, unknown>) {
    try {
      const qirType = String(payload.type1 || payload.type || '').trim();
      const isExternalQir = /^external\b/i.test(qirType);

      const internalRecipients = await this.emailNotificationsService.getRecipients(
        'internal_qir_notification',
      );
      const externalRecipients = isExternalQir
        ? await this.emailNotificationsService.getRecipients('external_qir_notification')
        : [];

      const to = this.uniqueEmails(internalRecipients);
      const cc = this.uniqueEmails(externalRecipients);

      if (to.length === 0 && cc.length === 0) {
        return;
      }

      const stakeholder = String(payload.stakeholder || '');
      const failureType = String(payload.failureType || '');
      const customerName = String(payload.customerName || '');
      const componentType = String(payload.componentType || '');
      const type1 = String(payload.type1 || '');
      const eyefiPartNumber = String(payload.eyefiPartNumber || '');
      const qtyAffected = String(payload.qtyAffected || '');
      const priority = String(payload.priority || '');
      const issueComment = this.toPlainText(payload.issueComment ?? payload.issue_comment_html);
      const link = this.urlBuilder.operations.qirEdit(insertId, 'Open');
      const createdDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

      const html = this.emailTemplateService.render('qir-created', {
        qirId: insertId,
        stakeholder,
        failureType,
        customerName,
        componentType,
        type1,
        eyefiPartNumber,
        qtyAffected,
        priority,
        issueComment,
        link,
        createdDate,
      });

      await this.emailService.sendMail({
        to: to.length > 0 ? to : cc,
        cc: to.length > 0 && cc.length > 0 ? cc : undefined,
        subject: `New QIR Submitted ${insertId} Stakeholder ${stakeholder}`,
        html,
      });
    } catch (error) {
      this.logger.warn(
        `QIR notification email failed for id ${insertId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private uniqueEmails(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
  }

  private toPlainText(value: unknown): string {
    const source = String(value ?? '').trim();
    if (!source) {
      return '';
    }

    const withBreaks = source
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ');

    const stripped = withBreaks
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, '"');

    return stripped
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

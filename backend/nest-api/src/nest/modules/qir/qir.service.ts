import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { EmailService } from '@/shared/email/email.service';
import { QirRepository } from './qir.repository';

@Injectable()
export class QirService {
  private readonly logger = new Logger(QirService.name);

  constructor(
    private readonly repository: QirRepository,
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
      const recipients = await this.repository.getNotificationRecipients('internal_qir_notification');
      if (recipients.length === 0) {
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
      const issueComment = String(payload.issueComment || '');
      const link = `https://dashboard.eye-fi.com/dist/web/dashboard/quality/qir/edit?id=${insertId}`;

      await this.emailService.sendMail({
        from: process.env.MAIL_FROM || 'noreply@the-fi-company.com',
        to: recipients,
        cc: ['ritz.dacanay@the-fi-company.com'],
        subject: `New QIR Submitted ${insertId} Stakeholder ${stakeholder}`,
        html: `
          <html>
            <body style="padding:50px">
              <p>Please do not reply to this email. To view this qir, click on the direct link to <a href="${link}" target="_parent">Quality Inspection Report</a>.</p>
              <p>QIR Number: ${insertId}. The QIR info and the issue statement is included below.</p>
              <p>Created Date: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}</p>
              <p>Stakeholder: ${this.escapeHtml(stakeholder)}</p>
              <p>Failure Type: ${this.escapeHtml(failureType)}</p>
              <p>Customer Name: ${this.escapeHtml(customerName)}</p>
              <p>Component Type: ${this.escapeHtml(componentType)}</p>
              <p>Type: ${this.escapeHtml(type1)}</p>
              <p>Part Number: ${this.escapeHtml(eyefiPartNumber)}</p>
              <p>Qty Affected: ${this.escapeHtml(qtyAffected)}</p>
              <p>Severity: ${this.escapeHtml(priority)}</p>
              <p>Issue statement:</p>
              <p>${this.escapeHtml(issueComment)}</p>
              <p><a href="${link}" target="_parent">View QIR</a></p>
              <p>Thank you</p>
            </body>
          </html>
        `,
      });
    } catch (error) {
      this.logger.warn(
        `QIR notification email failed for id ${insertId}: ${error instanceof Error ? error.message : String(error)}`,
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

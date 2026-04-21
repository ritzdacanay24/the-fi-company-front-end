import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RowDataPacket } from 'mysql2';
import { EmailService } from '@/shared/email/email.service';
import { NcrRepository } from './ncr.repository';

@Injectable()
export class NcrService {
  private readonly logger = new Logger(NcrService.name);

  constructor(
    private readonly repository: NcrRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
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

  async getOpenSummary() {
    return this.repository.getOpenSummary();
  }

  async getChart() {
    return this.repository.getChart();
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_NCR_NOT_FOUND',
        message: `NCR with id ${id} not found`,
      });
    }

    return row;
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    return { insertId };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const rowCount = await this.repository.updateById(id, payload);
    return { rowCount };
  }

  async updateAndSendEmailToDepartment(id: number, payload: Record<string, unknown>) {
    await this.getById(id);

    const department = String(payload.ca_iss_to || '').trim();
    const notificationKey = this.getAssignmentNotificationKey(department);

    let recipients: string[] = [];
    if (notificationKey) {
      recipients = await this.repository.getNotificationRecipients(notificationKey);
    }

    if (recipients.length > 0) {
      await this.emailService.sendMail({
        to: recipients,
        subject: `You are now assigned to NCR # ${id}`,
        html: this.buildAssignmentEmailHtml(id, department, String(payload.ca_due_dt || '')),
      });
    } else {
      this.logger.warn(`No recipients configured for NCR assignment department: ${department}`);
    }

    const rowCount = await this.repository.updateById(id, {
      ...payload,
      ca_email_sent_to: recipients.join(','),
    });

    return { rowCount, recipients };
  }

  async getComplaintCodes() {
    return this.repository.getComplaintCodes();
  }

  private getAssignmentNotificationKey(department: string): string | null {
    if (department === 'Production') return 'car_assigned_to_production';
    if (department === 'Logistics') return 'car_assigned_to_logistics';
    if (department === 'Quality') return 'car_assigned_to_quality';
    if (department === 'NPI') return 'car_assigned_to_npi';
    return null;
  }

  private buildAssignmentEmailHtml(id: number, department: string, dueDate: string): string {
    const link = new URL(
      `/dashboard/quality/car/overview?id=${id}&active=2`,
      this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL'),
    ).toString();
    const safeDepartment = this.escapeHtml(department || 'Unassigned');
    const safeDueDate = this.escapeHtml(dueDate || 'N/A');

    return `
      <html>
        <body>
          <p>This NCR is assigned to the ${safeDepartment} team and must be completed and submitted before or on ${safeDueDate}.</p>
          <p>To view this NCR, please click <a href="${link}">here</a>.</p>
        </body>
      </html>
    `;
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

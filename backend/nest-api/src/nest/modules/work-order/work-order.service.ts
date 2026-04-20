import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmailService } from '@/shared/email/email.service';
import { WorkOrderRecord, WorkOrderRepository } from './work-order.repository';

@Injectable()
export class WorkOrderService {
  constructor(
    private readonly repository: WorkOrderRepository,
    private readonly emailService: EmailService,
  ) {}

  async findOne(params: Record<string, unknown>): Promise<WorkOrderRecord | null> {
    const normalized = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );

    if (Object.keys(normalized).length === 0) {
      return null;
    }

    return this.repository.findOne(normalized);
  }

  async getById(id: number): Promise<WorkOrderRecord | null> {
    return this.repository.findOne({ id });
  }

  async getByWorkOrderId(workOrderId: number) {
    return this.repository.getByWorkOrderId(workOrderId);
  }

  async getAll(selectedViewType?: string, dateFrom?: string, dateTo?: string, isAllRaw?: string) {
    const isAll = String(isAllRaw).toLowerCase() === 'true';
    return this.repository.getAll(selectedViewType, dateFrom, dateTo, isAll);
  }

  async create(payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    const fsSchedulerId = Number(sanitized.fs_scheduler_id);

    if (!Number.isFinite(fsSchedulerId)) {
      throw new BadRequestException('fs_scheduler_id is required');
    }

    const existing = await this.repository.findOne({ fs_scheduler_id: fsSchedulerId });
    if (existing) {
      return existing.id;
    }

    const insertId = await this.repository.create(sanitized);
    return insertId;
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    return this.repository.findOne({ id });
  }

  async updateByIdBillingReview(id: number, payload: Record<string, unknown>) {
    const updated = await this.updateById(id, payload);

    const reviewStatus = String(payload.review_status || '');
    const fsSchedulerId = String(payload.fs_scheduler_id || '');

    if (reviewStatus && fsSchedulerId) {
      const link = `https://dashboard.eye-fi.com/dist/web/field-service/ticket/overview?selectedViewType=Open&active=7&id=${fsSchedulerId}`;

      if (reviewStatus === 'Pending Review') {
        await this.sendBillingReviewEmail({
          to: ['nick.walter@the-fi-company.com', 'adriann.k@the-fi-company.com'],
          bcc: ['ritz.dacanay@the-fi-company.com'],
          greeting: 'Dear Management,',
          fsSchedulerId,
          status: reviewStatus,
          link,
        });
      } else if (reviewStatus === 'Accounting') {
        await this.sendBillingReviewEmail({
          to: ['adriann.k@the-fi-company.com'],
          bcc: ['ritz.dacanay@the-fi-company.com'],
          greeting: 'Dear Accounting Team,',
          fsSchedulerId,
          status: reviewStatus,
          link,
        });
      }
    }

    return updated;
  }

  async deleteById(id: number): Promise<{ message: string }> {
    await this.repository.deleteWithRelations(id);
    return { message: 'Deleted' };
  }

  private async sendBillingReviewEmail(params: {
    to: string[];
    bcc: string[];
    greeting: string;
    fsSchedulerId: string;
    status: string;
    link: string;
  }) {
    const html = `
      <html>
        <body>
          <p>${params.greeting}</p>
          <p>A billing review is required for the following work order:</p>
          <p>
            <strong>Work Order ID:</strong> ${params.fsSchedulerId}<br />
            <strong>Status:</strong> ${params.status}
          </p>
          <p>You can review the billing details by clicking <a href="${params.link}">this link</a>.</p>
          <p>Thank you for your prompt attention to this matter.</p>
          <p>Best regards,<br/>The-Fi-Company</p>
          <hr style="margin:30px 0;" />
          <p style="font-size: 12px;">This is an automated email. Please do not respond.<br/>Thank you.</p>
        </body>
      </html>
    `;

    await this.emailService.sendMail({
      from: 'noreply@the-fi-company.com',
      to: params.to,
      bcc: params.bcc,
      subject: `Action Required: Billing Review - ${params.fsSchedulerId}`,
      html,
    });
  }
}

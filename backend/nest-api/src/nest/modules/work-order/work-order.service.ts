import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmailService } from '@/shared/email/email.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { toJsonSafe } from '@/shared/utils/json-safe.util';
import { addLowercaseAliases } from '@/shared/utils/row-alias.util';
import { WorkOrderRecord, WorkOrderRepository } from './work-order.repository';

@Injectable()
export class WorkOrderService {
  constructor(
    private readonly repository: WorkOrderRepository,
    private readonly emailService: EmailService,
    private readonly qadOdbcService: QadOdbcService,
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

  async getDetailsByWorkOrderNumber(workOrderNumber: string): Promise<Record<string, unknown>> {
    const normalized = String(workOrderNumber || '').trim();
    if (!normalized) {
      throw new BadRequestException('workOrderNumber is required');
    }

    const detailSql = `
      SELECT a.wod_nbr
        , a.wod_lot
        , a.wod_iss_date
        , a.wod_part
        , a.wod_qty_req wod_qty_req
        , a.wod_qty_pick wod_qty_pick
        , a.wod_qty_iss wod_qty_iss
        , a.wod_qty_all wod_qty_all
        , a.wod_qty_req-a.wod_qty_iss qty_open
        , a.wod_nbr
        , CONCAT(c.pt_desc1,c.pt_desc2) pt_desc1
        , c.pt_um
        , c.pt_part_type
        , d.totalAvail
        , d.totalOnHand
        , a.wod_qty_req - (a.wod_qty_pick+a.wod_qty_iss) short
        , CASE
            WHEN a.wod_qty_req = 0 THEN 0
            ELSE (a.wod_qty_iss/NULLIF(a.wod_qty_req, 0))*100
          END lineStatus
        , CASE
            WHEN a.wod_qty_req = 0 THEN 'text-success'
            WHEN (a.wod_qty_iss/NULLIF(a.wod_qty_req,0))*100 = '100' THEN 'text-success'
          END lineStatusClass
        , wod_op
        , wod_bom_qty wod_bom_qty
        , c.pt_rev
      FROM wod_det a
      LEFT JOIN pt_mstr c
        ON c.pt_part = a.wod_part
        AND pt_domain = 'EYE'
      LEFT JOIN (
        SELECT b.in_part
          , SUM(b.in_qty_avail) totalAvail
          , SUM(b.in_qty_all) totalAll
          , SUM(b.in_qty_oh) totalOnHand
        FROM in_mstr b
        WHERE b.in_domain = 'EYE'
        GROUP BY b.in_part
      ) d ON d.in_part = a.wod_part
      WHERE LTRIM(RTRIM(a.wod_nbr)) = ?
        AND wod_domain = 'EYE'
      ORDER BY a.wod_nbr ASC
      WITH (NOLOCK)
    `;

    const mainSql = `
      SELECT a.wo_so_job
        , a.wo_nbr
        , a.wo_lot
        , a.wo_ord_date
        , a.wo_due_date
        , a.wo_part
        , a.wo_qty_ord
        , CONCAT(c.pt_desc1,c.pt_desc2) pt_desc1
        , a.wo_order_sheet_printed
        , a.wo_status
        , a.wo_rmks
        , CASE WHEN a.wo_so_job = 'dropin' THEN 1 ELSE 0 END dropInClass
      FROM wo_mstr a
      LEFT JOIN pt_mstr c
        ON c.pt_part = a.wo_part
        AND pt_domain = 'EYE'
      WHERE a.wo_domain = 'EYE'
        AND LTRIM(RTRIM(a.wo_nbr)) = ?
      WITH (NOLOCK)
    `;

    const [details, mainRows] = await Promise.all([
      this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(detailSql, [normalized], {
        keyCase: 'upper',
      }),
      this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(mainSql, [normalized], {
        keyCase: 'upper',
      }),
    ]);

    return toJsonSafe({
      details: details.map((row) => addLowercaseAliases(row)),
      mainDetails: addLowercaseAliases(mainRows[0] || {}),
    }) as Record<string, unknown>;
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
      to: params.to,
      bcc: params.bcc,
      subject: `Action Required: Billing Review - ${params.fsSchedulerId}`,
      html,
    });
  }

}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private readonly configService: ConfigService,
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

  async getCompletedWorkOrders(): Promise<Record<string, unknown>[]> {
    const rows = await this.qadOdbcService.query<Array<Record<string, unknown>>>(
      `
        SELECT a.wo_nbr,
               a.wo_line,
               a.wo_due_date,
               a.wo_part,
               a.wo_qty_ord,
               a.wo_qty_comp,
               wod_qty_req,
               wod_qty_iss,
               CASE WHEN (wod_qty_iss > wod_qty_req) THEN 'Yes' END AS wod_status,
               wo_status AS real_wod_status
        FROM wo_mstr a
        LEFT JOIN (
          SELECT wod_nbr,
                 SUM(wod_qty_req) AS wod_qty_req,
                 SUM(wod_qty_iss) AS wod_qty_iss
          FROM wod_det
          GROUP BY wod_nbr
        ) b ON b.wod_nbr = a.wo_nbr
        WHERE a.wo_domain = 'EYE'
          AND a.wo_status NOT IN ('C', 'P', 'F', 'A')
          AND (a.wo_qty_comp - a.wo_qty_ord) = 0
      `,
      { keyCase: 'lower' },
    );

    return rows;
  }

  async getLegacyReadByWorkOrderNumber(workOrderNumber: string): Promise<Record<string, unknown>> {
    const normalized = String(workOrderNumber || '').trim();
    if (!normalized) {
      throw new BadRequestException('order is required');
    }

    const [mainRows, detailRows, routingRows] = await Promise.all([
      this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
        `
          SELECT *
          FROM wo_mstr
          WHERE wo_nbr = ?
            AND wo_domain = 'EYE'
          WITH (NOLOCK)
        `,
        [normalized],
        { keyCase: 'upper' },
      ),
      this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
        `
          SELECT *
          FROM wod_det
          WHERE wod_nbr = ?
            AND wod_domain = 'EYE'
          WITH (NOLOCK)
        `,
        [normalized],
        { keyCase: 'upper' },
      ),
      this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
        `
          SELECT *
          FROM wr_route
          WHERE wr_nbr = ?
            AND wr_domain = 'EYE'
          WITH (NOLOCK)
        `,
        [normalized],
        { keyCase: 'upper' },
      ),
    ]);

    const main = mainRows[0] || null;

    return toJsonSafe({
      main: addLowercaseAliases(main || {}),
      details: detailRows.map((row) => addLowercaseAliases(row)),
      routing: routingRows.map((row) => addLowercaseAliases(row)),
      orderFound: !!main,
    }) as Record<string, unknown>;
  }

  async getLegacyCustomerOrderNumbers(orderCategory: string): Promise<Record<string, unknown>[]> {
    const normalized = String(orderCategory || '').trim();
    if (!normalized) {
      throw new BadRequestException('customerOrderNumber is required');
    }

    const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
      `
        SELECT sod_nbr
          , sod_order_category
          , sod_custpart
          , sod_due_date
          , sod_part
          , a.*
        FROM sod_det
        LEFT JOIN (
          SELECT a.so_nbr
            , a.so_cust
            , a.so_ship
            , a.so_ord_date
            , a.so_req_date
            , a.so_due_date
            , a.so_shipvia
            , a.so_inv_date
            , a.so_ship_date
            , a.so_po
          FROM so_mstr a
          WHERE so_domain = 'EYE'
        ) a ON a.so_nbr = sod_det.sod_nbr
        WHERE sod_domain = 'EYE'
          AND sod_order_category = ?
        WITH (NOLOCK)
      `,
      [normalized],
      { keyCase: 'upper' },
    );

    return rows.map((row) => addLowercaseAliases(row));
  }

  async getLegacyTransactions(order: string): Promise<Record<string, unknown>[]> {
    const normalized = String(order || '').trim();
    if (!normalized) {
      throw new BadRequestException('order is required');
    }

    const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
      `
        SELECT tr_ship_id
          , tr_part
          , tr_date
          , tr_type
          , tr_last_date
          , tr_nbr
          , tr_addr
          , tr_rmks
          , tr_qty_loc
          , tr_userid
          , tr_type
          , tr_per_date
          , tr_last_date
          , tr_time
          , tr_qty_req
          , tr_qty_chg
        FROM tr_hist
        WHERE tr_so_job = ?
          AND tr_domain = 'EYE'
        WITH (NOLOCK)
      `,
      [normalized],
      { keyCase: 'upper' },
    );

    return rows.map((row) => addLowercaseAliases(row));
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
      const link = new URL(
        `/field-service/ticket/overview?selectedViewType=Open&active=7&id=${encodeURIComponent(fsSchedulerId)}`,
        this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL'),
      ).toString();

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

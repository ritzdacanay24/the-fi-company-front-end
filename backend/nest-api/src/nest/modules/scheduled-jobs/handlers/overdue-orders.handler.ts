import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { UrlBuilder } from '@/shared/url/url-builder';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface RoutingOverdueRow extends RowDataPacket {
  order_number: string;
  part_number: string;
  part_description?: string;
  open_qty: number;
  wo_due_date?: string;
  wr_op?: number;
  wo_need_date?: string;
  wo_ord_date?: string;
  wo_rel_date?: string;
  wo_per_date?: string;
  wo_so_job?: string;
  due_by: string;
}

interface RoutingUpsertRow extends RowDataPacket {
  order_number: string;
  part_number: string;
  part_description: string;
  open_qty: number;
  wo_due_date: string;
  wr_op: number;
  wo_need_date: string;
  wo_ord_date: string;
  wo_rel_date: string;
  wo_per_date: string;
  wo_so_job: string;
  due_by: string;
}

interface ShippingOverdueRow extends RowDataPacket {
  sod_nbr: string;
  sod_line: number;
  sod_part: string;
  open_qty: number;
  sod_due_date: string;
}

interface GraphicsOverdueRow extends RowDataPacket {
  wo_number: string;
  graphics_status: string;
  order_num: string;
  item_number: string;
  open_qty: number;
  due_date: string;
}

@Injectable()
export class OverdueOrdersHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(OverdueOrdersHandler.name);

  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly urlBuilder: UrlBuilder,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const today = this.todayKey();

      // Email routing rows per operation (matches overDueOrders.php routings() method)
      const [pickingRows, productionRows, qcRows] = await Promise.all([
        this.getRoutingRowsByOperation(10),
        this.getRoutingRowsByOperation(20),
        this.getRoutingRowsByOperation(30),
      ]);

      // MySQL upsert routing rows (matches overDueOrdersV1.php)
      const routingUpsertRows = await this.getRoutingRowsForUpsert();

      // Shipping rows: only open SOs (so_compl_date IS NULL), already overdue (matches overDueOrdersV1.php)
      const shippingRows = await this.getOpenShippingRows(today);

      // Graphics rows from MySQL graphicsSchedule (used to match overDueOrders.php overdue and due-today splits)
      const graphicsRows = await this.getGraphicsRows(today);

      // Shipping due-today count (matches overDueOrders.php shippingReport() count method)
      const shippingDueTodayCount = await this.getShippingDueTodayCount(today);

      // Routing due-today counts (matches overDueOrders.php dueToday($op) method)
      const [dueTodayPicking, dueTodayProduction, dueTodayQc] = await Promise.all([
        this.getRoutingDueTodayCount(10, today),
        this.getRoutingDueTodayCount(20, today),
        this.getRoutingDueTodayCount(30, today),
      ]);

      // Filter routing rows for email
      const overduePicking = this.filterOverdueRows(pickingRows, today);
      const overdueProduction = this.filterOverdueRows(productionRows, today);
      const overdueQc = this.filterOverdueRows(qcRows, today);
      const overdueShipping = shippingRows.filter((r) => String(r.sod_due_date || '').slice(0, 10) < today);
      const overdueGraphics = graphicsRows.filter((r) => String(r.due_date || '').slice(0, 10) < today);
      const dueTodayGraphics = graphicsRows.filter((r) => String(r.due_date || '').slice(0, 10) === today).length;

      const totalOverdue =
        overduePicking.length + overdueProduction.length + overdueQc.length + overdueShipping.length + overdueGraphics.length;

      // Upsert into MySQL overdue_orders + so_overdue_orders (matches overDueOrdersV1.php)
      const [routingUpserted, shippingUpserted] = await Promise.all([
        this.upsertRoutingToMySQL(routingUpsertRows),
        this.upsertShippingToMySQL(shippingRows),
      ]);

      if (totalOverdue > 0) {
        const recipientRows = await this.emailNotificationService.find({ location: 'overdue_orders' });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        if (to.length > 0) {
          const html = this.buildEmailBody({
            overduePicking,
            overdueProduction,
            overdueQc,
            overdueShipping,
            overdueGraphics,
            dueTodayPicking,
            dueTodayProduction,
            dueTodayQc,
            dueTodayShipping: shippingDueTodayCount,
            dueTodayGraphics,
          });

          await this.emailService.sendMail({
            to,
            subject: 'Overdue orders',
            html,
          });
        }
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(
        `[${trigger}] overdue-orders -> ${totalOverdue} overdue lines, ${routingUpserted} routing upserted, ${shippingUpserted} shipping upserted in ${durationMs}ms`,
      );

      return {
        id: 'overdue-orders',
        name: 'Overdue Orders Report',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${totalOverdue} overdue lines. ${routingUpserted} routing + ${shippingUpserted} shipping rows written to MySQL.`,
        lastRun: {
          startedAt: new Date(startedAtMs).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs,
          status: 'success',
          triggerType: trigger,
          errorMessage: null,
        },
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - startedAtMs;
      const message = error instanceof Error ? error.message : String(error);
      const odbcErrors = (error as Record<string, unknown>)?.odbcErrors;
      this.logger.error(`[${trigger}] overdue-orders failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] overdue-orders ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: 'overdue-orders',
        name: 'Overdue Orders Report',
        trigger,
        ok: false,
        statusCode: 500,
        durationMs,
        message,
        lastRun: {
          startedAt: new Date(startedAtMs).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs,
          status: 'failure',
          triggerType: trigger,
          errorMessage: message,
        },
      };
    }
  }

  // ─── QAD queries ────────────────────────────────────────────────────────────

  /**
   * Matches overDueOrders.php routings($op) method.
   */
  private async getRoutingRowsByOperation(op: number): Promise<RoutingOverdueRow[]> {
    const sql = `
      SELECT
        wr_nbr AS order_number,
        a.wr_qty_ord - a.wr_qty_comp AS open_qty,
        dueBy AS due_by,
        a.wr_part AS part_number
      FROM (
        SELECT
          a.wr_nbr,
          a.wr_op,
          a.wr_qty_ord,
          a.wr_qty_wip,
          a.wr_qty_comp,
          a.wr_status,
          a.wr_due,
          a.wr_part,
          a.wr_queue,
          a.wr_qty_inque,
          CASE
            WHEN b.wo_so_job = 'dropin' THEN wr_due
            ELSE
              CASE
                WHEN a.wr_op = 10 THEN
                  CASE
                    WHEN DAYOFWEEK ( wr_due ) IN (1) THEN wr_due - 4
                    WHEN DAYOFWEEK ( wr_due ) IN (2) THEN wr_due - 4
                    WHEN DAYOFWEEK ( wr_due ) IN (3) THEN wr_due - 4
                    WHEN DAYOFWEEK ( wr_due ) IN (4) THEN wr_due - 2
                    WHEN DAYOFWEEK ( wr_due ) IN (5) THEN wr_due - 2
                    WHEN DAYOFWEEK ( wr_due ) IN (6) THEN wr_due - 2
                    WHEN DAYOFWEEK ( wr_due ) IN (7) THEN wr_due - 3
                    ELSE wr_due - 2
                  END
                WHEN a.wr_op = 20 THEN
                  CASE
                    WHEN DAYOFWEEK ( wr_due ) IN (1) THEN wr_due - 3
                    WHEN DAYOFWEEK ( wr_due ) IN (2) THEN wr_due - 3
                    WHEN DAYOFWEEK ( wr_due ) IN (3) THEN wr_due - 1
                    WHEN DAYOFWEEK ( wr_due ) IN (4) THEN wr_due - 1
                    WHEN DAYOFWEEK ( wr_due ) IN (5) THEN wr_due - 1
                    WHEN DAYOFWEEK ( wr_due ) IN (6) THEN wr_due - 1
                    WHEN DAYOFWEEK ( wr_due ) IN (7) THEN wr_due - 2
                    ELSE wr_due - 1
                  END
                WHEN a.wr_op = 30 THEN
                  CASE
                    WHEN DAYOFWEEK ( wr_due ) IN (1) THEN wr_due - 2
                    WHEN DAYOFWEEK ( wr_due ) IN (2, 3) THEN wr_due - 0
                    WHEN DAYOFWEEK ( wr_due ) IN (4) THEN wr_due - 0
                    ELSE wr_due - 0
                  END
                ELSE wo_due_date
              END
          END AS dueBy
        FROM wr_route a
        JOIN (
          SELECT wo_nbr, wo_so_job, wo_due_date
          FROM wo_mstr
          WHERE wo_domain = 'EYE'
            AND wo_status != 'c'
        ) b ON b.wo_nbr = a.wr_nbr
        WHERE a.wr_qty_ord != a.wr_qty_comp
          AND a.wr_domain = 'EYE'
          AND a.wr_op = ?
      ) a
    `;

    return this.qadOdbcService.queryWithParams<RoutingOverdueRow[]>(sql, [op], { keyCase: 'lower' });
  }

  /**
   * Matches overDueOrdersV1.php routing query used for overdue_orders upserts.
   */
  private async getRoutingRowsForUpsert(): Promise<RoutingUpsertRow[]> {
    const sql = `
      SELECT
        wr_nbr AS order_number,
        a.wr_qty_ord - a.wr_qty_comp AS open_qty,
        dueBy AS due_by,
        a.wr_part AS part_number,
        wr_op,
        full_Desc AS part_description,
        wr_due AS wo_due_date,
        wo_so_job,
        wo_need_date,
        wo_ord_date,
        wo_rel_date,
        wo_per_date
      FROM (
        SELECT
          a.wr_nbr,
          a.wr_op,
          a.wr_qty_ord,
          a.wr_qty_wip,
          a.wr_qty_comp,
          a.wr_status,
          a.wr_due,
          a.wr_part,
          a.wr_queue,
          a.wr_qty_inque,
          c.full_Desc,
          wo_so_job,
          wo_need_date,
          wo_ord_date,
          wo_rel_date,
          wo_per_date,
          CASE
            WHEN b.wo_so_job = 'dropin' THEN wr_due
            ELSE
              CASE
                WHEN a.wr_op = 10 THEN
                  CASE
                    WHEN DAYOFWEEK ( wr_due ) IN (1) THEN wr_due - 6
                    WHEN DAYOFWEEK ( wr_due ) IN (2) THEN wr_due - 7
                    WHEN DAYOFWEEK ( wr_due ) IN (3) THEN wr_due - 7
                    WHEN DAYOFWEEK ( wr_due ) IN (4) THEN wr_due - 7
                    WHEN DAYOFWEEK ( wr_due ) IN (5) THEN wr_due - 7
                    WHEN DAYOFWEEK ( wr_due ) IN (6) THEN wr_due - 8
                    WHEN DAYOFWEEK ( wr_due ) IN (7) THEN wr_due - 5
                    ELSE wr_due - 5
                  END
                WHEN a.wr_op = 20 THEN
                  CASE
                    WHEN DAYOFWEEK ( wr_due ) IN (1) THEN wr_due - 4
                    WHEN DAYOFWEEK ( wr_due ) IN (2) THEN wr_due - 5
                    WHEN DAYOFWEEK ( wr_due ) IN (3) THEN wr_due - 5
                    WHEN DAYOFWEEK ( wr_due ) IN (4) THEN wr_due - 5
                    WHEN DAYOFWEEK ( wr_due ) IN (5) THEN wr_due - 3
                    WHEN DAYOFWEEK ( wr_due ) IN (6) THEN wr_due - 3
                    WHEN DAYOFWEEK ( wr_due ) IN (7) THEN wr_due - 3
                    ELSE wr_due - 3
                  END
                WHEN a.wr_op = 30 THEN
                  CASE
                    WHEN DAYOFWEEK ( wr_due ) IN (1) THEN wr_due - 2
                    WHEN DAYOFWEEK ( wr_due ) IN (2, 3) THEN wr_due - 4
                    WHEN DAYOFWEEK ( wr_due ) IN (4) THEN wr_due - 2
                    ELSE wr_due - 2
                  END
                ELSE wo_due_date
              END
          END AS dueBy
        FROM wr_route a
        JOIN (
          SELECT wo_nbr, wo_so_job, wo_need_date, wo_ord_date, wo_rel_date, wo_per_date, wo_due_date
          FROM wo_mstr
          WHERE wo_domain = 'EYE'
            AND wo_status != 'c'
        ) b ON b.wo_nbr = a.wr_nbr
        LEFT JOIN (
          SELECT pt_part, MAX(pt_desc1 || ' ' || pt_desc2) AS full_Desc
          FROM pt_mstr
          WHERE pt_domain = 'EYE'
          GROUP BY pt_part
        ) c ON c.pt_part = a.wr_part
        WHERE a.wr_qty_ord != a.wr_qty_comp
          AND a.wr_domain = 'EYE'
      ) a
      WHERE dueBy <= curDate()
    `;

    return this.qadOdbcService.query<RoutingUpsertRow[]>(sql, { keyCase: 'lower' });
  }

  /**
   * Matches overDueOrdersV1.php + overDueOrders.php shippingReport usage.
   * Filters so_compl_date IS NULL (only open SOs) and sod_due_date <= today.
   */
  private async getOpenShippingRows(_today: string): Promise<ShippingOverdueRow[]> {
    const sql = `
      SELECT
        a.sod_line,
        a.sod_nbr,
        a.sod_part,
        a.sod_qty_ord - a.sod_qty_ship AS open_qty,
        a.sod_due_date
      FROM sod_det a
      JOIN (
        SELECT so_nbr, so_compl_date
        FROM so_mstr
        WHERE so_domain = 'EYE'
          AND so_compl_date IS NULL
      ) c ON c.so_nbr = a.sod_nbr
      WHERE sod_due_date <= curDate()
        AND sod_qty_ord != sod_qty_ship
    `;

    return this.qadOdbcService.query<ShippingOverdueRow[]>(sql, { keyCase: 'lower' });
  }

  /**
   * Matches overDueOrders.php shippingReport() count method — count of SO lines due today.
   */
  private async getShippingDueTodayCount(today: string): Promise<number> {
    const sql = `
      SELECT COUNT(a.sod_nbr) AS due_total
      FROM sod_det a
      LEFT JOIN (
        SELECT so_nbr, so_compl_date
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) c ON c.so_nbr = a.sod_nbr
      WHERE a.sod_domain = 'EYE'
        AND a.sod_due_date = ?
    `;

    type CountRow = { due_total: number | string };
    const rows = await this.qadOdbcService.queryWithParams<CountRow[]>(sql, [today], { keyCase: 'lower' });
    return Number(rows[0]?.due_total || 0);
  }

  /**
   * Matches overDueOrders.php dueToday($op) method for today_count.
   */
  private async getRoutingDueTodayCount(op: number, today: string): Promise<number> {
    const sql = `
      SELECT
        COUNT(1) AS today_count
      FROM (
        SELECT
          wr_nbr AS wr_nbr,
          a.wr_qty_ord - a.wr_qty_comp AS openQty,
          dueBy AS dueBy,
          a.wr_part AS wr_part,
          a.wr_qty_ord,
          a.wr_qty_comp,
          op_qty_comp,
          op_tran_date,
          op_qty_comp_backflush,
          wo_status,
          CASE WHEN wo_status = 'C' OR a.wr_qty_ord - a.wr_qty_comp = 0 THEN 1 ELSE 0 END AS complete_status
        FROM (
          SELECT
            a.wr_nbr,
            a.wr_op,
            a.wr_qty_ord,
            a.wr_qty_wip,
            a.wr_qty_comp,
            a.wr_status,
            a.wr_due,
            a.wr_part,
            a.wr_queue,
            a.wr_qty_inque,
            CASE
              WHEN b.wo_so_job = 'dropin' THEN wr_due
              ELSE
                CASE
                  WHEN a.wr_op = 10 THEN
                    CASE
                      WHEN DAYOFWEEK ( wr_due ) IN (1) THEN wr_due - 4
                      WHEN DAYOFWEEK ( wr_due ) IN (2) THEN wr_due - 4
                      WHEN DAYOFWEEK ( wr_due ) IN (3) THEN wr_due - 4
                      WHEN DAYOFWEEK ( wr_due ) IN (4) THEN wr_due - 2
                      WHEN DAYOFWEEK ( wr_due ) IN (5) THEN wr_due - 2
                      WHEN DAYOFWEEK ( wr_due ) IN (6) THEN wr_due - 2
                      WHEN DAYOFWEEK ( wr_due ) IN (7) THEN wr_due - 3
                      ELSE wr_due - 2
                    END
                  WHEN a.wr_op = 20 THEN
                    CASE
                      WHEN DAYOFWEEK ( wr_due ) IN (1) THEN wr_due - 3
                      WHEN DAYOFWEEK ( wr_due ) IN (2) THEN wr_due - 3
                      WHEN DAYOFWEEK ( wr_due ) IN (3) THEN wr_due - 1
                      WHEN DAYOFWEEK ( wr_due ) IN (4) THEN wr_due - 1
                      WHEN DAYOFWEEK ( wr_due ) IN (5) THEN wr_due - 1
                      WHEN DAYOFWEEK ( wr_due ) IN (6) THEN wr_due - 1
                      WHEN DAYOFWEEK ( wr_due ) IN (7) THEN wr_due - 2
                      ELSE wr_due - 1
                    END
                  WHEN a.wr_op = 30 THEN
                    CASE
                      WHEN DAYOFWEEK ( wr_due ) IN (1) THEN wr_due - 2
                      WHEN DAYOFWEEK ( wr_due ) IN (2, 3) THEN wr_due - 0
                      WHEN DAYOFWEEK ( wr_due ) IN (4) THEN wr_due - 0
                      ELSE wr_due - 0
                    END
                  ELSE wo_due_date
                END
            END AS dueBy,
            d.op_qty_comp,
            d.op_tran_date,
            d.op_qty_comp AS op_qty_comp_backflush,
            wo_status
          FROM wr_route a
          LEFT JOIN (
            SELECT wo_nbr, wo_so_job, wo_status, wo_due_date
            FROM wo_mstr
            WHERE wo_domain = 'EYE'
          ) b ON b.wo_nbr = a.wr_nbr
          LEFT JOIN (
            SELECT op_wo_nbr, SUM(op_qty_comp) AS op_qty_comp, MAX(op_tran_date) AS op_tran_date
            FROM op_hist
            WHERE op_wo_op = ?
              AND op_domain = 'EYE'
              AND op_type = 'BACKFLSH'
            GROUP BY op_wo_nbr
          ) d ON d.op_wo_nbr = a.wr_nbr
          WHERE a.wr_domain = 'EYE'
            AND a.wr_op = ?
        ) a
      ) b
      WHERE dueBy = ?
        AND complete_status = 0
    `;

    type CountRow = { today_count: number | string | null };
    const rows = await this.qadOdbcService.queryWithParams<CountRow[]>(sql, [op, op, today], { keyCase: 'lower' });
    return Number(rows[0]?.today_count || 0);
  }

  // ─── MySQL queries ───────────────────────────────────────────────────────────

  /**
   * Matches overDueOrders.php graphicsResults section.
   * Reads overdue graphics orders from MySQL graphicsSchedule.
   */
  private async getGraphicsRows(today: string): Promise<GraphicsOverdueRow[]> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(`
      SELECT
        a.graphicsWorkOrder AS wo_number,
        COALESCE(q.name, '')  AS graphics_status,
        a.orderNum            AS order_num,
        a.itemNumber          AS item_number,
        (a.qty - a.qtyShipped) AS open_qty,
        a.dueDate             AS due_date
      FROM eyefidb.graphicsSchedule a
      LEFT JOIN eyefidb.graphicsQueues q ON q.queueStatus = a.status AND q.active = 1
      WHERE a.active = 1
        AND a.qty - a.qtyShipped != 0
        AND LOWER(COALESCE(a.graphicsWorkOrder, '')) != 'stock'
        AND COALESCE(q.name, '') != 'Ship'
        AND DATE(a.dueDate) <= ?
      ORDER BY a.dueDate ASC
    `, [today]);

    return rows as GraphicsOverdueRow[];
  }

  // ─── MySQL upserts (matches overDueOrdersV1.php REPLACE INTO behavior) ──────

  /**
   * REPLACE INTO eyefidb.overdue_orders for each routing row where dueBy <= today.
   * Matches overDueOrdersV1.php foreach loop.
   */
  private async upsertRoutingToMySQL(rows: RoutingUpsertRow[]): Promise<number> {
    if (rows.length === 0) return 0;

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let affected = 0;

    for (const row of rows) {
      const uniqueId = `${row.order_number}-${row.wr_op}`;
      await this.mysqlService.execute<ResultSetHeader>(
        `REPLACE INTO eyefidb.overdue_orders
          (wo_nbr, part_number, part_description, open_qty, wo_due_date, wr_due_by, wr_op,
           updated_date, unique_id, wo_need_date, wo_ord_date, wo_rel_date, wo_per_date, wo_so_job)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.order_number,
          row.part_number,
          row.part_description || null,
          row.open_qty,
          row.wo_due_date || null,
          row.due_by || null,
          row.wr_op,
          now,
          uniqueId,
          row.wo_need_date || null,
          row.wo_ord_date || null,
          row.wo_rel_date || null,
          row.wo_per_date || null,
          row.wo_so_job || null,
        ],
      );
      affected++;
    }

    return affected;
  }

  /**
   * REPLACE INTO eyefidb.so_overdue_orders for each shipping row.
   * Matches overDueOrdersV1.php foreach loop.
   */
  private async upsertShippingToMySQL(rows: ShippingOverdueRow[]): Promise<number> {
    if (rows.length === 0) return 0;

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let affected = 0;

    for (const row of rows) {
      const uniqueId = `${row.sod_nbr}-${row.sod_line}`;
      await this.mysqlService.execute<ResultSetHeader>(
        `REPLACE INTO eyefidb.so_overdue_orders
          (so_line, so_nbr, part_number, open_qty, due_date, updated_date, unique_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          row.sod_line,
          row.sod_nbr,
          row.sod_part,
          row.open_qty,
          row.sod_due_date || null,
          now,
          uniqueId,
        ],
      );
      affected++;
    }

    return affected;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private normalizeDateKey(value: unknown): string | null {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    const asText = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(asText)) return asText.slice(0, 10);
    return null;
  }

  private filterOverdueRows<T extends { due_by: string }>(rows: T[], todayKey: string): T[] {
    return rows.filter((row) => {
      const dk = this.normalizeDateKey(row.due_by);
      return typeof dk === 'string' && dk < todayKey;
    });
  }

  private countDueTodayRows<T extends { due_by: string }>(rows: T[], todayKey: string): number {
    return rows.filter((row) => this.normalizeDateKey(row.due_by) === todayKey).length;
  }

  // ─── Email builder (matches overDueOrders.php SendMail() HTML layout) ────────

  private buildEmailBody(data: {
    overduePicking: RoutingOverdueRow[];
    overdueProduction: RoutingOverdueRow[];
    overdueQc: RoutingOverdueRow[];
    overdueShipping: ShippingOverdueRow[];
    overdueGraphics: GraphicsOverdueRow[];
    dueTodayPicking: number;
    dueTodayProduction: number;
    dueTodayQc: number;
    dueTodayShipping: number;
    dueTodayGraphics: number;
  }): string {
    let html = 'Good morning team, <br><br><html><body>';

    // Summary table (matches overDueOrders.php summary block)
    html += '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
    html += "<tr style='background: #eee;'><td></td><td><strong>Picking</strong></td><td><strong>Production</strong></td><td><strong>QC</strong></td><td><strong>Shipping</strong></td><td><strong>Graphics</strong></td></tr>";
    html += `<tr><td>Overdue Order Lines</td><td style='color:red;text-align:center'>${data.overduePicking.length}</td><td style='color:red;text-align:center'>${data.overdueProduction.length}</td><td style='color:red;text-align:center'>${data.overdueQc.length}</td><td style='color:red;text-align:center'>${data.overdueShipping.length}</td><td style='color:red;text-align:center'>${data.overdueGraphics.length}</td></tr>`;
    html += `<tr><td>Order Lines Due Today</td><td style='text-align:center'>${data.dueTodayPicking}</td><td style='text-align:center'>${data.dueTodayProduction}</td><td style='text-align:center'>${data.dueTodayQc}</td><td style='text-align:center'>${data.dueTodayShipping}</td><td style='text-align:center'>${data.dueTodayGraphics}</td></tr>`;
    html += '</table><br><hr>';

    html += this.buildRoutingTable('Pick and Stage Material overdue work orders', data.overduePicking, 'Picking Due By');
    html += this.buildRoutingTable('Production overdue work orders', data.overdueProduction, 'Production Due By');
    html += this.buildRoutingTable('Final/Test QC overdue work orders', data.overdueQc, 'QC Due By');
    html += this.buildShippingTable(data.overdueShipping);
    html += this.buildGraphicsTable(data.overdueGraphics);

    html += 'This automated email will be sent daily at 4am <br>Thank you.</body></html>';
    return html;
  }

  private buildRoutingTable(title: string, rows: RoutingOverdueRow[], dueDateLabel: string): string {
    let html = `<h3>${title}: <span style='color:red'>${rows.length} lines</span></h3>`;
    html += '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
    html += `<tr style='background: #eee;'><td><strong>Work Order #</strong></td><td><strong>Part #</strong></td><td><strong>Open Qty</strong></td><td><strong>${dueDateLabel}</strong></td></tr>`;
    for (const row of rows) {
      const link = this.urlBuilder.operations.woLookup(row.order_number);
      html += `<tr><td><a href='${link}' target='_parent'>${row.order_number}</a></td><td>${row.part_number}</td><td>${Number(row.open_qty || 0).toFixed(2)}</td><td>${row.due_by}</td></tr>`;
    }
    html += '</table><br><hr>';
    return html;
  }

  private buildShippingTable(rows: ShippingOverdueRow[]): string {
    let html = `<h3>Shipping overdue orders: <span style='color:red'>${rows.length} lines</span></h3>`;
    html += '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
    html += "<tr style='background: #eee;'><td><strong>SO #</strong></td><td><strong>Line #</strong></td><td><strong>Part #</strong></td><td><strong>Open Qty</strong></td><td><strong>Due date</strong></td></tr>";
    for (const row of rows) {
      const link = this.urlBuilder.operations.orderLookup(row.sod_nbr);
      html += `<tr><td><a href='${link}' target='_parent'>${row.sod_nbr}</a></td><td>${row.sod_line}</td><td>${row.sod_part}</td><td>${Number(row.open_qty || 0).toFixed(2)}</td><td>${row.sod_due_date}</td></tr>`;
    }
    html += '</table><br><hr>';
    return html;
  }

  private buildGraphicsTable(rows: GraphicsOverdueRow[]): string {
    let html = `<h3>Graphics overdue orders: <span style='color:red'>${rows.length} lines</span></h3>`;
    html += '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
    html += "<tr style='background: #eee;'><td><strong>WO #</strong></td><td><strong>Graphics Status</strong></td><td><strong>SO #</strong></td><td><strong>Part #</strong></td><td><strong>Qty Needed</strong></td><td><strong>Due date</strong></td></tr>";
    for (const row of rows) {
      html += `<tr><td>${row.wo_number}</td><td>${row.graphics_status}</td><td>${row.order_num}</td><td>${row.item_number}</td><td>${Number(row.open_qty || 0).toFixed(2)}</td><td>${row.due_date}</td></tr>`;
    }
    html += '</table><br><hr>';
    return html;
  }
}

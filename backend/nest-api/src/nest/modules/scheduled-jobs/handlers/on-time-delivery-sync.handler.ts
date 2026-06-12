import { Injectable, Logger } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { MysqlService } from '@/shared/database/mysql.service';
import { SCHEDULED_JOB_IDS } from '../scheduled-job-ids';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface OtdSourceRow {
  so_cust: string | null;
  so_nbr: string | null;
  sod_line: number | string | null;
  sod_per_date: string | null;
  last_shipped_on: string | null;
  sod_qty_ord: number | string | null;
  abs_ship_qty: number | string | null;
  diff: number | string | null;
  week: number | string | null;
  year: number | string | null;
  month: number | string | null;
  is_late: string | null;
  shipped_partial: string | null;
  abs_par_id: string | null;
}

interface MaxPerformanceDateRow extends RowDataPacket {
  max_performance_date: string | null;
}

@Injectable()
export class OnTimeDeliverySyncHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(OnTimeDeliverySyncHandler.name);
  private static readonly LEGACY_MIGRATION_BACKFILL_START = '2026-05-06';

  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly mysqlService: MysqlService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const today = this.toDateOnly(new Date());
      const windowStart = await this.resolveWindowStart();

      if (windowStart > today) {
        const durationMs = Date.now() - startedAtMs;
        this.logger.log(
          `[${trigger}] ${SCHEDULED_JOB_IDS.ON_TIME_DELIVERY_SYNC} -> no backfill needed (start=${windowStart}, today=${today}) in ${durationMs}ms`,
        );

        return {
          id: SCHEDULED_JOB_IDS.ON_TIME_DELIVERY_SYNC,
          name: 'On-Time Delivery Sync',
          trigger,
          ok: true,
          statusCode: 200,
          durationMs,
          message: `On-time delivery sync is already up to date. Last covered date is ${this.shiftDate(windowStart, -1)}.`,
          lastRun: {
            startedAt: new Date(startedAtMs).toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs,
            status: 'success',
            triggerType: trigger,
            errorMessage: null,
          },
        };
      }

      const sourceSql = `
        SELECT
          c.so_cust,
          c.so_nbr,
          a.sod_line,
          a.sod_per_date,
          f.abs_shp_date AS last_shipped_on,
          CAST(a.sod_qty_ord AS DECIMAL(16,2)) AS sod_qty_ord,
          IFNULL(CAST(f.abs_ship_qty AS DECIMAL(16,2)), 0) AS abs_ship_qty,
          IFNULL(a.sod_per_date - f.abs_shp_date, a.sod_per_date - CURDATE()) AS diff,
          WEEK(a.sod_per_date) AS week,
          YEAR(a.sod_per_date) AS year,
          MONTH(a.sod_per_date) AS month,
          CASE
            WHEN a.sod_per_date - f.abs_shp_date < 0 AND a.sod_per_date < CURDATE() THEN 'Yes'
            WHEN f.abs_shp_date IS NULL THEN 'Yes'
            WHEN a.sod_per_date < CURDATE() AND a.sod_qty_ord != f.abs_ship_qty THEN 'Yes'
            ELSE 'No'
          END AS is_late,
          CASE WHEN a.sod_qty_ord - f.abs_ship_qty > 0 THEN 'Shipped Partial' END AS shipped_partial,
          f.abs_par_id
        FROM sod_det a
        JOIN (
          SELECT so_nbr, so_cust
          FROM so_mstr
          WHERE so_domain = 'EYE'
        ) c ON c.so_nbr = a.sod_nbr
        LEFT JOIN (
          SELECT
            a.abs_shipto,
            a.abs_shp_date,
            a.abs_item,
            a.abs_line,
            SUM(a.abs_ship_qty) AS abs_ship_qty,
            a.abs_inv_nbr,
            SUBSTRING(a.abs_par_id, 2, LENGTH(a.abs_par_id)) AS abs_par_id,
            a.abs_order
          FROM abs_mstr a
          WHERE a.abs_domain = 'EYE'
          GROUP BY
            a.abs_shipto,
            a.abs_shp_date,
            a.abs_item,
            a.abs_line,
            a.abs_inv_nbr,
            SUBSTRING(a.abs_par_id, 2, LENGTH(a.abs_par_id)),
            a.abs_order
        ) f ON f.abs_order = a.sod_nbr AND f.abs_line = a.sod_line
        WHERE
          ((f.abs_shp_date BETWEEN ? AND ?) OR a.sod_per_date BETWEEN ? AND ?)
          AND a.sod_domain = 'EYE'
        ORDER BY c.so_cust, a.sod_per_date ASC
      `;

      const replaceSql = `
        REPLACE INTO on_time_delivery (
          so_nbr,
          performance_date,
          shipped_qty,
          week,
          year,
          month,
          difference,
          is_late,
          last_shipped_on,
          shipped_partial,
          customer,
          line_nbr,
          qty_ordered,
          sod_nbr_and_line
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      let sourceCount = 0;
      let upsertedCount = 0;

      for (const date of this.eachDateInclusive(windowStart, today)) {
        const rows = await this.qadOdbcService.queryWithParams<OtdSourceRow[]>(
          sourceSql,
          [date, date, date, date],
          { keyCase: 'lower' },
        );

        sourceCount += rows.length;
        if (!rows.length) {
          continue;
        }

        const affectedForDay = await this.mysqlService.withTransaction(async (connection) => {
          let affected = 0;

          for (const row of rows) {
            const soNumber = String(row.so_nbr || '').trim();
            const lineNumber = Number(row.sod_line || 0) || 0;
            const absParId = String(row.abs_par_id || '').trim();
            const compositeKey = `${soNumber}-${lineNumber}-${absParId}`;

            const [result] = await connection.execute<ResultSetHeader>(replaceSql, [
              soNumber,
              row.sod_per_date,
              Number(row.abs_ship_qty || 0),
              Number(row.week || 0),
              Number(row.year || 0),
              Number(row.month || 0),
              Number(row.diff || 0),
              row.is_late || 'No',
              row.last_shipped_on,
              row.shipped_partial || null,
              row.so_cust || '',
              lineNumber,
              Number(row.sod_qty_ord || 0),
              compositeKey,
            ]);

            affected += Number(result.affectedRows || 0);
          }

          return affected;
        });

        upsertedCount += affectedForDay;
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(
        `[${trigger}] ${SCHEDULED_JOB_IDS.ON_TIME_DELIVERY_SYNC} -> range=${windowStart}..${today}, sourceRows=${sourceCount}, affectedRows=${upsertedCount} in ${durationMs}ms`,
      );

      return {
        id: SCHEDULED_JOB_IDS.ON_TIME_DELIVERY_SYNC,
        name: 'On-Time Delivery Sync',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `On-time delivery sync completed for ${windowStart} to ${today}. Source rows: ${sourceCount}. Affected rows: ${upsertedCount}.`,
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

      this.logger.error(
        `[${trigger}] ${SCHEDULED_JOB_IDS.ON_TIME_DELIVERY_SYNC} failed in ${durationMs}ms: ${message}`,
      );
      if (odbcErrors) {
        this.logger.error(
          `[${trigger}] ${SCHEDULED_JOB_IDS.ON_TIME_DELIVERY_SYNC} ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`,
        );
      }

      return {
        id: SCHEDULED_JOB_IDS.ON_TIME_DELIVERY_SYNC,
        name: 'On-Time Delivery Sync',
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

  private async resolveWindowStart(): Promise<string> {
    const today = this.toDateOnly(new Date());
    const rows = await this.mysqlService.query<MaxPerformanceDateRow[]>(
      `
        SELECT MAX(performance_date) AS max_performance_date
        FROM on_time_delivery
        WHERE performance_date <= ?
      `,
      [today],
    );

    const maxDate = String(rows[0]?.max_performance_date || '').trim();
    const baseline = OnTimeDeliverySyncHandler.LEGACY_MIGRATION_BACKFILL_START;

    if (!maxDate) {
      return baseline;
    }

    const nextDate = this.shiftDate(maxDate, 1);
    return nextDate < baseline ? baseline : nextDate;
  }

  private shiftDate(dateIso: string, days: number): string {
    const date = new Date(`${dateIso}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return this.toDateOnly(date);
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private *eachDateInclusive(startIso: string, endIso: string): Generator<string> {
    let cursor = startIso;
    while (cursor <= endIso) {
      yield cursor;
      cursor = this.shiftDate(cursor, 1);
    }
  }
}

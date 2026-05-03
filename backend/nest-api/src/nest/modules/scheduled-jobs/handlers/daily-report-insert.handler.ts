import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

@Injectable()
export class DailyReportInsertHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(DailyReportInsertHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly qadOdbcService: QadOdbcService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      // Get production metrics from QAD
      const prodMetrics = await this.qadOdbcService.query<RowDataPacket[]>(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_orders
        FROM work_order
        WHERE DATE(created_date) = CURDATE()
      `);

      // Get shipping metrics from QAD
      const shipMetrics = await this.qadOdbcService.query<RowDataPacket[]>(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as shipped_orders,
          SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open_orders
        FROM shipping_order
        WHERE DATE(ship_date) = CURDATE()
      `);

      const prodData = prodMetrics[0] || {};
      const shipData = shipMetrics[0] || {};

      // Insert daily report record
      await this.mysqlService.query(`
        INSERT INTO daily_report 
        (report_date, production_total, production_completed, production_in_progress, 
         shipping_total, shipping_completed, shipping_open, created_at)
        VALUES (CURDATE(), ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          production_total = VALUES(production_total),
          production_completed = VALUES(production_completed),
          production_in_progress = VALUES(production_in_progress),
          shipping_total = VALUES(shipping_total),
          shipping_completed = VALUES(shipping_completed),
          shipping_open = VALUES(shipping_open),
          created_at = NOW()
      `, [
        prodData.total_orders || 0,
        prodData.completed_orders || 0,
        prodData.in_progress_orders || 0,
        shipData.total_orders || 0,
        shipData.shipped_orders || 0,
        shipData.open_orders || 0,
      ]);

      const durationMs = Date.now() - startedAtMs;
      const summary = `Production: ${prodData.total_orders} total (${prodData.completed_orders} completed), Shipping: ${shipData.total_orders} total (${shipData.shipped_orders} shipped)`;
      this.logger.log(`[${trigger}] daily-report-insert -> ${summary} in ${durationMs}ms`);

      return {
        id: 'daily-report-insert',
        name: 'Daily Report Insert',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `Daily report metrics inserted: ${summary}`,
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
      this.logger.error(`[${trigger}] daily-report-insert failed in ${durationMs}ms: ${message}`);

      return {
        id: 'daily-report-insert',
        name: 'Daily Report Insert',
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
}

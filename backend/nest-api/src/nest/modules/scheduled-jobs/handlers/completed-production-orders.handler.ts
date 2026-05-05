import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { UrlBuilder } from '@/shared/url/url-builder';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface CompletedOrder extends RowDataPacket {
  wo_nbr: string;
  wo_line: string;
  wo_due_date: string;
  wo_part: string;
  wo_qty_ord: number;
  wo_qty_comp: number;
  wod_qty_req: number;
  wod_qty_iss: number;
  wod_status: string;
  age: number;
}

interface OverCompletedRoute extends RowDataPacket {
  wr_nbr: string;
  wr_op: number;
  wr_wkctr: string;
  wr_qty_ord: number;
  wr_qty_comp: number;
  wr_status: string;
}

@Injectable()
export class CompletedProductionOrdersHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(CompletedProductionOrdersHandler.name);

  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly urlBuilder: UrlBuilder,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const data = await this.qadOdbcService.query<CompletedOrder[]>(`
        SELECT
          a.wo_nbr,
          a.wo_line,
          a.wo_due_date,
          a.wo_part,
          a.wo_qty_ord,
          a.wo_qty_comp,
          b.wod_qty_req,
          b.wod_qty_iss,
          RTRIM(LTRIM(CASE WHEN (b.wod_qty_req - b.wod_qty_iss) = 0 THEN 'Yes' ELSE 'No' END)) AS wod_status,
          CURDATE() - a.wo_due_date AS age
        FROM wo_mstr a
        LEFT JOIN (
          SELECT
            wod_nbr,
            SUM(wod_qty_req) AS wod_qty_req,
            SUM(wod_qty_iss) AS wod_qty_iss
          FROM wod_det
          GROUP BY wod_nbr
        ) b ON b.wod_nbr = a.wo_nbr
        WHERE a.wo_domain = 'EYE'
          AND a.wo_status NOT IN ('C','P','F','A')
          AND (a.wo_qty_comp - a.wo_qty_ord) = 0
        ORDER BY CURDATE() - a.wo_due_date DESC
      `, { keyCase: 'lower' });

      const overCompleted = await this.qadOdbcService.query<OverCompletedRoute[]>(`
        SELECT
          wr_nbr,
          wr_op,
          wr_wkctr,
          wr_qty_ord,
          wr_qty_comp,
          wr_status
        FROM wr_route
        WHERE wr_qty_comp > wr_qty_ord
          AND wr_domain = 'EYE'
          AND wr_status = 'Q'
      `, { keyCase: 'lower' });

      const readyToClose = data.filter((r) => r.wod_status === 'Yes' || String(r.wo_line || '').toLowerCase() === 'graphics');
      const withPickingIssues = data.filter((r) => r.wod_status === 'No' && String(r.wo_line || '').toLowerCase() !== 'graphics');

      const hasReportRows = data.length > 0 || overCompleted.length > 0;
      if (hasReportRows) {
        const recipientRows = await this.emailNotificationService.find({ location: 'production_orders' });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        if (to.length > 0) {
          const html = this.buildEmailBody(readyToClose, withPickingIssues, overCompleted);
          await this.emailService.sendMail({
            to,
            subject: 'Work Order Status Report',
            html,
          });
        }
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] completed-production-orders -> ${data.length} records in ${durationMs}ms`);

      return {
        id: 'completed-production-orders',
        name: 'Completed Production Orders',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${data.length} work orders analyzed (${readyToClose.length} ready, ${withPickingIssues.length} with issues, ${overCompleted.length} over-completed).`,
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
      this.logger.error(`[${trigger}] completed-production-orders failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] completed-production-orders ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: 'completed-production-orders',
        name: 'Completed Production Orders',
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

  private buildEmailBody(
    readyToClose: CompletedOrder[],
    withPickingIssues: CompletedOrder[],
    overCompleted: OverCompletedRoute[],
  ): string {
    return this.emailTemplateService.render('work-order-status-report', {
      summary: {
        readyToClose: readyToClose.length,
        pickingIssues: withPickingIssues.length,
      },
      readyToCloseRows: this.mapCompletedRows(readyToClose),
      pickingIssueRows: this.mapCompletedRows(withPickingIssues),
      overCompletedRows: overCompleted.map((row) => ({
        workOrder: row.wr_nbr,
        workOrderLink: this.urlBuilder.operations.woLookup(row.wr_nbr),
        operation: row.wr_op,
        workCenter: row.wr_wkctr,
        qtyOrdered: Number(row.wr_qty_ord || 0).toFixed(2),
        qtyCompleted: Number(row.wr_qty_comp || 0).toFixed(2),
        status: row.wr_status,
      })),
      overCompletedCount: overCompleted.length,
      hasReadyToClose: readyToClose.length > 0,
      hasPickingIssues: withPickingIssues.length > 0,
      hasOverCompleted: overCompleted.length > 0,
    });
  }

  private mapCompletedRows(rows: CompletedOrder[]): Array<{
    workOrder: string;
    workOrderLink: string;
    line: string;
    dueDate: string;
    part: string;
    qtyOrdered: string;
    qtyCompleted: string;
    qtyRequired: string;
    qtyIssued: string;
    status: string;
    ageText: string;
  }> {
    return rows.map((r) => ({
      workOrder: r.wo_nbr,
      workOrderLink: this.urlBuilder.operations.woLookup(r.wo_nbr),
      line: r.wo_line,
      dueDate: r.wo_due_date,
      part: r.wo_part,
      qtyOrdered: Number(r.wo_qty_ord || 0).toFixed(2),
      qtyCompleted: Number(r.wo_qty_comp || 0).toFixed(2),
      qtyRequired: Number(r.wod_qty_req || 0).toFixed(2),
      qtyIssued: Number(r.wod_qty_iss || 0).toFixed(2),
      status: r.wod_status,
      ageText: Number(r.age || 0) < 0 ? '-' : `${Number(r.age || 0)} day(s)`,
    }));
  }
}

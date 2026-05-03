import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface DropInWorkOrder extends RowDataPacket {
  wo_nbr: string;
  wo_ord_date: string;
  wo_due_date: string;
  wo_qty_ord: number;
  wo_part: string;
  pt_desc1: string;
  pt_desc2: string;
}

@Injectable()
export class DropInWorkOrderEmailsHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(DropInWorkOrderEmailsHandler.name);

  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly emailService: EmailService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const workOrders = await this.qadOdbcService.query<DropInWorkOrder[]>(`
        SELECT
          a.wo_nbr,
          a.wo_ord_date,
          a.wo_due_date,
          a.wo_qty_ord,
          a.wo_part,
          b.pt_desc1,
          b.pt_desc2
        FROM wo_mstr a
        LEFT JOIN (
          SELECT
            pt_part,
            MAX(pt_desc1) AS pt_desc1,
            MAX(pt_desc2) AS pt_desc2
          FROM pt_mstr
          WHERE pt_domain = 'EYE'
          GROUP BY pt_part
        ) b ON b.pt_part = a.wo_part
        WHERE a.wo_qty_ord <> a.wo_qty_comp
          AND a.wo_domain = 'EYE'
          AND (a.wo_so_job = 'dropin' OR a.wo_so_job = 'DROPIN')
      `, { keyCase: 'lower' });

      if (workOrders.length > 0) {
        let tableRows = '';
        for (const row of workOrders) {
          tableRows += `<tr>
            <td>${row.wo_nbr}</td>
            <td>${row.wo_ord_date}</td>
            <td>${row.wo_qty_ord}</td>
            <td>${row.wo_due_date}</td>
            <td>${row.wo_part}</td>
            <td>${(row.pt_desc1 || '') + ' ' + (row.pt_desc2 || '')}</td>
          </tr>`;
        }

        const html = `
          <p>Listed below are hot drop-in orders that need immediate action.</p>
          <table rules="all" style="border-color:#666" cellpadding="5" border="1">
            <tr style="background:#eee">
              <th>Work Order #</th>
              <th>Ordered Date</th>
              <th>Qty Ordered</th>
              <th>Due Date</th>
              <th>Item #</th>
              <th>Description</th>
            </tr>
            ${tableRows}
          </table>
        `;

        await this.emailService.sendMail({
          to: ['hotdrops@eye-fi.com'],
          subject: `Hot Drop In - Work Order (${workOrders.length})`,
          html,
        });
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] dropin-workorder-emails -> ${workOrders.length} drop-in orders in ${durationMs}ms`);

      return {
        id: 'dropin-workorder-emails',
        name: 'Drop-In Work Order Emails',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${workOrders.length} drop-in work orders processed.`,
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
      this.logger.error(`[${trigger}] dropin-workorder-emails failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] dropin-workorder-emails ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: 'dropin-workorder-emails',
        name: 'Drop-In Work Order Emails',
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

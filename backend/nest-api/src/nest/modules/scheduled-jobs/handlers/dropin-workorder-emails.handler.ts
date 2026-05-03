import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

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
      // Query QAD for drop-in work orders that are open (not completed)
      // A drop-in work order is one that has no previous schedule or is marked as hot/drop-in
      const workOrders = await this.qadOdbcService.query<RowDataPacket[]>(`
        SELECT 
          wo.order_number,
          wo.reference,
          wo.customer_po,
          wo.due_date,
          wo.status,
          c.name as customer_name,
          wo.created_date
        FROM work_order wo
        LEFT JOIN customer c ON c.id = wo.customer_id
        WHERE wo.drop_in = 1
        AND wo.status NOT IN ('Completed', 'Cancelled')
        ORDER BY wo.created_date DESC
      `);

      const to = ['hotdrops@eye-fi.com'];

      if (workOrders.length > 0) {
        let tableRows = '';
        for (const wo of workOrders as Array<Record<string, unknown>>) {
          tableRows += `<tr>
            <td>${wo['order_number']}</td>
            <td>${wo['reference']}</td>
            <td>${wo['customer_po']}</td>
            <td>${wo['due_date']}</td>
            <td>${wo['customer_name']}</td>
            <td>${wo['status']}</td>
          </tr>`;
        }

        const html = `
          <p>The following drop-in work orders have been received and are awaiting scheduling:</p>
          <table rules="all" style="border-color:#666" cellpadding="5" border="1">
            <tr style="background:#eee">
              <th>Order #</th>
              <th>Reference</th>
              <th>PO #</th>
              <th>Due Date</th>
              <th>Customer</th>
              <th>Status</th>
            </tr>
            ${tableRows}
          </table>
          <p>This is an automated message. Total drop-in work orders: ${workOrders.length}</p>
        `;

        await this.emailService.sendMail({
          to,
          subject: `Hot Drop-In Work Orders (${workOrders.length})`,
          html,
        });
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(
        `[${trigger}] dropin-workorder-emails -> ${workOrders.length} drop-in orders in ${durationMs}ms`,
      );

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
      this.logger.error(`[${trigger}] dropin-workorder-emails failed in ${durationMs}ms: ${message}`);

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

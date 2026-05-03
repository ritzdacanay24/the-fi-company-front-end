import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface CompletedOrder extends RowDataPacket {
  order_number: string;
  reference: string;
  customer_name: string;
  status: string;
  completion_date: string;
  picking_issues: number;
  total_lines: number;
}

@Injectable()
export class CompletedProductionOrdersHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(CompletedProductionOrdersHandler.name);

  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly emailService: EmailService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      // Query QAD for work orders completed today with picking issues
      const completedOrders = await this.qadOdbcService.query<CompletedOrder[]>(`
        SELECT 
          wo.order_number,
          wo.reference,
          c.name as customer_name,
          wo.status,
          wo.completion_date,
          COUNT(CASE WHEN wol.picking_issue = 1 THEN 1 END) as picking_issues,
          COUNT(*) as total_lines
        FROM work_order wo
        JOIN work_order_line wol ON wol.work_order_id = wo.id
        LEFT JOIN customer c ON c.id = wo.customer_id
        WHERE DATE(wo.completion_date) = CURDATE()
        AND wo.status = 'Completed'
        GROUP BY wo.order_number, wo.reference, c.name, wo.status, wo.completion_date
        HAVING picking_issues > 0
        ORDER BY picking_issues DESC, wo.completion_date DESC
      `);

      if (completedOrders.length > 0) {
        const recipientRows = await this.emailNotificationService.find({ location: 'production_orders' });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        let tableRows = '';
        let totalPickingIssues = 0;

        for (const order of completedOrders) {
          totalPickingIssues += order.picking_issues;
          tableRows += `<tr>
            <td>${order.order_number}</td>
            <td>${order.reference}</td>
            <td>${order.customer_name}</td>
            <td>${order.total_lines}</td>
            <td style="color:red;font-weight:bold">${order.picking_issues}</td>
            <td>${((order.picking_issues / order.total_lines) * 100).toFixed(1)}%</td>
            <td>${order.completion_date}</td>
          </tr>`;
        }

        const html = `
          <p>The following work orders were completed today and have picking issues that require attention:</p>
          <table rules="all" style="border-color:#666" cellpadding="5" border="1">
            <tr style="background:#eee">
              <th>Order #</th>
              <th>Reference</th>
              <th>Customer</th>
              <th>Total Lines</th>
              <th>Picking Issues</th>
              <th>% with Issues</th>
              <th>Completion Date</th>
            </tr>
            ${tableRows}
          </table>
          <p><strong>Summary:</strong> ${completedOrders.length} orders with ${totalPickingIssues} total picking issues.</p>
          <p style="font-size:12px;color:#999">
            This is an automated message. Report generated on ${new Date().toLocaleString()}
          </p>
        `;

        await this.emailService.sendMail({
          to,
          subject: `Production Status Report - ${completedOrders.length} completed orders with picking issues`,
          html,
        });
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(
        `[${trigger}] completed-production-orders -> ${completedOrders.length} orders with issues in ${durationMs}ms`,
      );

      return {
        id: 'completed-production-orders',
        name: 'Completed Production Orders',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${completedOrders.length} completed orders with picking issues reported.`,
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
      this.logger.error(`[${trigger}] completed-production-orders failed in ${durationMs}ms: ${message}`);

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

  private async resolveNotificationEmails(location: string): Promise<string[]> {
    const rows = await this.emailNotificationService.find({ location });
    const recipients = new Set<string>();

    for (const row of rows as Array<Record<string, unknown>>) {
      const values = [row['email'], row['notification_emails']]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      for (const email of values) {
        recipients.add(email);
      }
    }

    return Array.from(recipients);
  }
}

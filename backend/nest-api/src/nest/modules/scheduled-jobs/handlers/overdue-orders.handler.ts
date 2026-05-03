import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface OverdueOrder extends RowDataPacket {
  order_number: string;
  reference: string;
  customer_name: string;
  operation: string;
  due_date: string;
  days_overdue: number;
  priority: string;
}

@Injectable()
export class OverdueOrdersHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(OverdueOrdersHandler.name);

  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly emailService: EmailService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      // Query QAD for overdue work orders (production operations)
      const productionOverdue = await this.qadOdbcService.query<OverdueOrder[]>(`
        SELECT 
          wo.order_number,
          wo.reference,
          c.name as customer_name,
          'Production' as operation,
          wo.due_date,
          DATEDIFF(CURDATE(), wo.due_date) as days_overdue,
          wo.priority
        FROM work_order wo
        LEFT JOIN customer c ON c.id = wo.customer_id
        WHERE wo.status IN ('Open', 'In Progress')
        AND wo.due_date < CURDATE()
        ORDER BY wo.due_date ASC
      `);

      // Query QAD for overdue shipments
      const shippingOverdue = await this.qadOdbcService.query<OverdueOrder[]>(`
        SELECT 
          so.order_number,
          so.reference,
          c.name as customer_name,
          'Shipping' as operation,
          so.due_date,
          DATEDIFF(CURDATE(), so.due_date) as days_overdue,
          so.priority
        FROM shipping_order so
        LEFT JOIN customer c ON c.id = so.customer_id
        WHERE so.status IN ('Open', 'Scheduled')
        AND so.due_date < CURDATE()
        ORDER BY so.due_date ASC
      `);

      // Query for overdue graphics jobs
      const graphicsOverdue = await this.qadOdbcService.query<OverdueOrder[]>(`
        SELECT 
          gj.order_number,
          gj.reference,
          c.name as customer_name,
          'Graphics' as operation,
          gj.due_date,
          DATEDIFF(CURDATE(), gj.due_date) as days_overdue,
          gj.priority
        FROM graphics_job gj
        LEFT JOIN customer c ON c.id = gj.customer_id
        WHERE gj.status IN ('Open', 'In Progress')
        AND gj.due_date < CURDATE()
        ORDER BY gj.due_date ASC
      `);

      const totalOverdue = productionOverdue.length + shippingOverdue.length + graphicsOverdue.length;

      if (totalOverdue > 0) {
        const recipientRows = await this.emailNotificationService.find({ location: 'overdue_orders' });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        let emailBody = '<h2>Daily Overdue Orders Report</h2>';

        if (productionOverdue.length > 0) {
          emailBody += '<h3 style="color:#d9534f">Production Operations - Overdue</h3>';
          emailBody += this.buildOverdueTable(productionOverdue);
        }

        if (shippingOverdue.length > 0) {
          emailBody += '<h3 style="color:#d9534f">Shipping - Overdue</h3>';
          emailBody += this.buildOverdueTable(shippingOverdue);
        }

        if (graphicsOverdue.length > 0) {
          emailBody += '<h3 style="color:#d9534f">Graphics Jobs - Overdue</h3>';
          emailBody += this.buildOverdueTable(graphicsOverdue);
        }

        emailBody += `<div style="margin-top:30px;padding-top:20px;border-top:1px solid #ccc">
          <strong>Summary:</strong>
          <ul>
            <li>Production Orders: ${productionOverdue.length}</li>
            <li>Shipping Orders: ${shippingOverdue.length}</li>
            <li>Graphics Jobs: ${graphicsOverdue.length}</li>
            <li><strong>Total Overdue: ${totalOverdue}</strong></li>
          </ul>
          <p style="font-size:12px;color:#999">
            This report is automatically generated daily. Please address the overdue items as priority.
          </p>
        </div>`;

        await this.emailService.sendMail({
          to,
          subject: `🚨 Overdue Orders Alert - ${totalOverdue} items past due`,
          html: emailBody,
        });
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] overdue-orders -> ${totalOverdue} overdue items in ${durationMs}ms`);

      return {
        id: 'overdue-orders',
        name: 'Overdue Orders Report',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${totalOverdue} overdue orders reported.`,
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
      this.logger.error(`[${trigger}] overdue-orders failed in ${durationMs}ms: ${message}`);

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

  private buildOverdueTable(orders: OverdueOrder[]): string {
    let tableRows = '';
    for (const order of orders) {
      const daysStyle = order.days_overdue > 7 ? 'color:red;font-weight:bold' : 'color:orange;font-weight:bold';
      tableRows += `<tr>
        <td>${order.order_number}</td>
        <td>${order.reference}</td>
        <td>${order.customer_name || 'N/A'}</td>
        <td>${order.due_date}</td>
        <td style="${daysStyle}">${order.days_overdue}</td>
        <td>${order.priority || 'Normal'}</td>
      </tr>`;
    }

    return `<table rules="all" style="border-color:#666" cellpadding="5" border="1">
      <tr style="background:#f5f5f5">
        <th>Order #</th>
        <th>Reference</th>
        <th>Customer</th>
        <th>Due Date</th>
        <th>Days Overdue</th>
        <th>Priority</th>
      </tr>
      ${tableRows}
    </table><br>`;
  }

}

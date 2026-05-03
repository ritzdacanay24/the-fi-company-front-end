import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface ShippedOrderDetail extends RowDataPacket {
  order_number: string;
  reference: string;
  customer_name: string;
  total_quantity: number;
  total_weight: number;
  ship_date: string;
  carrier: string;
}

@Injectable()
export class TotalShippedOrdersHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(TotalShippedOrdersHandler.name);

  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly emailService: EmailService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      // Query for all orders shipped today
      const shippedOrders = await this.qadOdbcService.query<ShippedOrderDetail[]>(`
        SELECT 
          so.order_number,
          so.reference,
          c.name as customer_name,
          SUM(sol.quantity_ordered) as total_quantity,
          SUM(sol.weight) as total_weight,
          so.ship_date,
          so.carrier
        FROM shipping_order so
        JOIN shipping_order_line sol ON sol.shipping_order_id = so.id
        LEFT JOIN customer c ON c.id = so.customer_id
        WHERE DATE(so.ship_date) = CURDATE()
        AND so.status = 'Completed'
        GROUP BY so.order_number, so.reference, c.name, so.ship_date, so.carrier
        ORDER BY so.ship_date DESC, so.order_number ASC
      `);

      if (shippedOrders.length > 0) {
        const recipientRows = await this.emailNotificationService.find({ location: 'total_shipped_orders_report' });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        let tableRows = '';
        let totalQuantityShipped = 0;
        let totalWeightShipped = 0;

        for (const order of shippedOrders) {
          totalQuantityShipped += order.total_quantity;
          totalWeightShipped += order.total_weight ?? 0;
          tableRows += `<tr>
            <td>${order.order_number}</td>
            <td>${order.reference}</td>
            <td>${order.customer_name || 'N/A'}</td>
            <td>${order.total_quantity}</td>
            <td>${(order.total_weight ?? 0).toFixed(2)} lbs</td>
            <td>${order.carrier || 'Standard'}</td>
          </tr>`;
        }

        const html = `
          <h2>Total Shipped Orders Report - ${new Date().toLocaleDateString()}</h2>
          <p>The following orders were shipped today:</p>
          <table rules="all" style="border-color:#666" cellpadding="5" border="1">
            <tr style="background:#eee">
              <th>Order #</th>
              <th>Reference</th>
              <th>Customer</th>
              <th>Quantity</th>
              <th>Weight</th>
              <th>Carrier</th>
            </tr>
            ${tableRows}
          </table>
          <div style="margin-top:20px;padding:15px;background:#f9f9f9;border:1px solid #ddd">
            <h3>Summary</h3>
            <ul>
              <li>Total Orders Shipped: <strong>${shippedOrders.length}</strong></li>
              <li>Total Quantity: <strong>${totalQuantityShipped}</strong> units</li>
              <li>Total Weight: <strong>${totalWeightShipped.toFixed(2)}</strong> lbs</li>
            </ul>
          </div>
          <p style="font-size:12px;color:#999;margin-top:20px">
            This is an automatically generated daily shipping report.
            Report generated on ${new Date().toLocaleString()}
          </p>
        `;

        await this.emailService.sendMail({
          to,
          subject: `Daily Shipping Report - ${shippedOrders.length} orders (${totalQuantityShipped} units)`,
          html,
        });
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] total-shipped-orders -> ${shippedOrders.length} orders in ${durationMs}ms`);

      return {
        id: 'total-shipped-orders',
        name: 'Total Shipped Orders Report',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${shippedOrders.length} shipped orders processed and reported.`,
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
      this.logger.error(`[${trigger}] total-shipped-orders failed in ${durationMs}ms: ${message}`);

      return {
        id: 'total-shipped-orders',
        name: 'Total Shipped Orders Report',
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

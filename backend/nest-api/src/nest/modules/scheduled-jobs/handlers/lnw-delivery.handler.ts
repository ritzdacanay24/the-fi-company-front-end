import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface LNWShipment extends RowDataPacket {
  order_number: string;
  reference: string;
  due_date: string;
  quantity: number;
  customer_name: string;
}

@Injectable()
export class LnwDeliveryHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(LnwDeliveryHandler.name);

  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly emailService: EmailService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      // Calculate the next 3 weekdays (skip weekends)
      const weekdayDates = this.getNext3Weekdays();

      // Build the SQL WHERE clause for the 3 weekdays
      const dateConditions = weekdayDates.map((date) => `DATE(so.due_date) = '${date}'`).join(' OR ');

      // Query QAD for shipments to Baltec locations (NV.PILOT, NV.PECOS) due on the next 3 weekdays
      const shipments = await this.qadOdbcService.query<LNWShipment[]>(`
        SELECT 
          so.order_number,
          so.reference,
          so.due_date,
          SUM(sol.quantity_ordered) as quantity,
          c.name as customer_name
        FROM shipping_order so
        JOIN shipping_order_line sol ON sol.shipping_order_id = so.id
        JOIN customer c ON c.id = so.customer_id
        WHERE (c.code = 'NV.PILOT' OR c.code = 'NV.PECOS')
        AND (${dateConditions})
        AND so.status IN ('Open', 'Scheduled')
        GROUP BY so.order_number, so.reference, so.due_date, c.name
        ORDER BY so.due_date ASC, so.order_number ASC
      `);

      if (shipments.length > 0) {
        const recipientRows = await this.emailNotificationService.find({ location: 'lnw_shipping_report_notification' });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        let tableRows = '';
        for (const shipment of shipments) {
          tableRows += `<tr>
            <td>${shipment.order_number}</td>
            <td>${shipment.reference}</td>
            <td>${shipment.due_date}</td>
            <td>${shipment.quantity}</td>
            <td>${shipment.customer_name}</td>
          </tr>`;
        }

        const dateRange = `${weekdayDates[0]} - ${weekdayDates[2]}`;

        const html = `
          <p>The following shipments are scheduled for delivery to Baltec locations in the next 3 weekdays (${dateRange}):</p>
          <table rules="all" style="border-color:#666" cellpadding="5" border="1">
            <tr style="background:#eee">
              <th>Order #</th>
              <th>Reference</th>
              <th>Due Date</th>
              <th>Quantity</th>
              <th>Customer</th>
            </tr>
            ${tableRows}
          </table>
          <p style="font-size:12px;color:#999">
            This is an automated message. Total shipments: ${shipments.length}
          </p>
        `;

        await this.emailService.sendMail({
          to,
          subject: `LNW Delivery Schedule - ${shipments.length} shipments (${dateRange})`,
          html,
        });
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] lnw-delivery -> ${shipments.length} shipments in ${durationMs}ms`);

      return {
        id: 'lnw-delivery',
        name: 'LNW Delivery Schedule',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${shipments.length} shipments scheduled for Baltec locations in next 3 weekdays.`,
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
      this.logger.error(`[${trigger}] lnw-delivery failed in ${durationMs}ms: ${message}`);

      return {
        id: 'lnw-delivery',
        name: 'LNW Delivery Schedule',
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

  /**
   * Returns the next 3 weekday dates (Monday-Friday), excluding weekends.
   * Starts from tomorrow.
   */
  private getNext3Weekdays(): string[] {
    const weekdays: string[] = [];
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow

    while (weekdays.length < 3) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // 0 = Sunday, 6 = Saturday
        weekdays.push(this.formatDate(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return weekdays;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

}

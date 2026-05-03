import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface ShippedOrderDetail extends RowDataPacket {
  order_number: string;
  po_number: string;
  ship_to: string;
  total_quantity: number;
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
      const today = new Date().toISOString().slice(0, 10);
      const shippedOrders = await this.qadOdbcService.queryWithParams<ShippedOrderDetail[]>(`
        SELECT
          a.sod_nbr AS order_number,
          MAX(a.sod_contr_id) AS po_number,
          MAX(c.so_ship) AS ship_to,
          SUM(CAST(f.abs_ship_qty AS NUMERIC(36,0))) AS total_quantity
        FROM sod_det a
        JOIN so_mstr c ON c.so_nbr = a.sod_nbr
          AND c.so_domain = 'EYE'
        JOIN abs_mstr f ON f.abs_order = a.sod_nbr
          AND f.abs_line = a.sod_line
          AND f.abs_domain = 'EYE'
        WHERE a.sod_domain = 'EYE'
          AND f.abs_shp_date = ?
          AND f.abs_ship_qty > 0
        GROUP BY a.sod_nbr
        ORDER BY a.sod_nbr ASC
      `, [today], { keyCase: 'lower' });

      if (shippedOrders.length > 0) {
        const recipientRows = await this.emailNotificationService.find({ location: 'total_shipped_orders_report' });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        if (to.length > 0) {
          const totalQuantity = shippedOrders.reduce((acc, row) => acc + Number(row.total_quantity || 0), 0);
          const rows = shippedOrders
            .map(
              (row) =>
                `<tr><td>${row.order_number}</td><td>${row.po_number || ''}</td><td>${row.ship_to || ''}</td><td>${row.total_quantity || 0}</td></tr>`,
            )
            .join('');

          await this.emailService.sendMail({
            to,
            subject: `Daily Shipping Report - ${shippedOrders.length} orders`,
            html: `
              <h3>Total Shipped Orders (${today})</h3>
              <table rules="all" style="border-color:#666" cellpadding="5" border="1">
                <tr style="background:#eee"><th>SO #</th><th>PO #</th><th>Ship To</th><th>Total Qty</th></tr>
                ${rows}
              </table>
              <p><strong>Total Quantity:</strong> ${totalQuantity}</p>
            `,
          });
        }
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
        message: `${shippedOrders.length} shipped orders processed.`,
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
      this.logger.error(`[${trigger}] total-shipped-orders failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] total-shipped-orders ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

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

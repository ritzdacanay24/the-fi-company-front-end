import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface OpenShippingRequest extends RowDataPacket {
  order_number: string;
  reference: string;
  customer_name: string;
  requested_date: string;
  priority: string;
  status: string;
  days_open: number;
}

@Injectable()
export class OpenShippingRequestsHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(OpenShippingRequestsHandler.name);

  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly emailService: EmailService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      // Query for open shipping requests
      const openRequests = await this.qadOdbcService.query<OpenShippingRequest[]>(`
        SELECT 
          sr.order_number,
          sr.reference,
          c.name as customer_name,
          sr.requested_date,
          sr.priority,
          sr.status,
          DATEDIFF(CURDATE(), sr.requested_date) as days_open
        FROM shipping_request sr
        LEFT JOIN customer c ON c.id = sr.customer_id
        WHERE sr.status IN ('Open', 'Pending')
        ORDER BY sr.priority DESC, sr.requested_date ASC
      `);

      if (openRequests.length > 0) {
        const recipientRows = await this.emailNotificationService.find({ location: 'open_shipping_requests_notification' });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        // Group by priority
        const byPriority = this.groupByPriority(openRequests);

        let emailBody = '<h2>Open Shipping Requests Summary</h2>';
        emailBody += `<p>Total open requests: <strong>${openRequests.length}</strong></p>`;

        for (const priority of ['critical', 'high', 'normal', 'low']) {
          const requests = byPriority[priority] || [];
          if (requests.length > 0) {
            const priorityColor = priority === 'critical' ? '#d9534f' : priority === 'high' ? '#f0ad4e' : '#5bc0de';
            emailBody += `<h3 style="color:${priorityColor}">${priority.toUpperCase()} Priority (${requests.length})</h3>`;
            emailBody += this.buildRequestsTable(requests);
          }
        }

        emailBody += `<p style="font-size:12px;color:#999;margin-top:20px">
          This is an automatically generated shipping requests summary.
          Generated on ${new Date().toLocaleString()}
        </p>`;

        await this.emailService.sendMail({
          to,
          subject: `Open Shipping Requests - ${openRequests.length} items`,
          html: emailBody,
        });
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] open-shipping-requests -> ${openRequests.length} open requests in ${durationMs}ms`);

      return {
        id: 'open-shipping-requests',
        name: 'Open Shipping Requests Report',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${openRequests.length} open shipping requests reported.`,
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
      this.logger.error(`[${trigger}] open-shipping-requests failed in ${durationMs}ms: ${message}`);

      return {
        id: 'open-shipping-requests',
        name: 'Open Shipping Requests Report',
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

  private groupByPriority(requests: OpenShippingRequest[]): Record<string, OpenShippingRequest[]> {
    return requests.reduce(
      (acc, req) => {
        const priority = (req.priority || 'normal').toLowerCase();
        if (!acc[priority]) {
          acc[priority] = [];
        }
        acc[priority].push(req);
        return acc;
      },
      {} as Record<string, OpenShippingRequest[]>,
    );
  }

  private buildRequestsTable(requests: OpenShippingRequest[]): string {
    let tableRows = '';
    for (const req of requests) {
      tableRows += `<tr>
        <td>${req.order_number}</td>
        <td>${req.reference}</td>
        <td>${req.customer_name || 'N/A'}</td>
        <td>${req.requested_date}</td>
        <td>${req.days_open} days</td>
      </tr>`;
    }

    return `<table rules="all" style="border-color:#666" cellpadding="5" border="1">
      <tr style="background:#f5f5f5">
        <th>Order #</th>
        <th>Reference</th>
        <th>Customer</th>
        <th>Requested Date</th>
        <th>Days Open</th>
      </tr>
      ${tableRows}
    </table><br>`;
  }

}

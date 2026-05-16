import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { SCHEDULED_JOB_IDS } from '../scheduled-job-ids';
import { ScheduledJobRecipientsService } from '../scheduled-job-recipients.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface OpenShippingRequest extends RowDataPacket {
  id: number;
  requestor_name: string;
  company_name: string;
  created_date: string;
  tracking_number: string | null;
  age_days: number;
}

@Injectable()
export class OpenShippingRequestsHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(OpenShippingRequestsHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly scheduledJobRecipientsService: ScheduledJobRecipientsService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const openRequests = await this.mysqlService.query<OpenShippingRequest[]>(`
        SELECT
          a.id,
          a.requestorName AS requestor_name,
          a.companyName AS company_name,
          a.createdDate AS created_date,
          a.trackingNumber AS tracking_number,
          DATEDIFF(CURDATE(), a.createdDate) AS age_days
        FROM forms.shipping_request a
        WHERE a.active = 1
          AND a.completedDate IS NULL
          AND DATEDIFF(CURDATE(), a.createdDate) > 7
        ORDER BY a.createdDate ASC
      `);

      if (openRequests.length > 0) {
        const to = await this.scheduledJobRecipientsService.resolveSubscribedEmails(SCHEDULED_JOB_IDS.OPEN_SHIPPING_REQUESTS);

        if (to.length > 0) {
          let tableRows = '';
          for (const req of openRequests) {
            tableRows += `<tr>
              <td>${req.requestor_name || ''}</td>
              <td>${req.company_name || ''}</td>
              <td>${req.created_date || ''}</td>
              <td>${req.age_days}</td>
              <td>${req.tracking_number || ''}</td>
            </tr>`;
          }

          const html = `
            <p>Open shipping requests older than 7 days require attention.</p>
            <table rules="all" style="border-color:#666" cellpadding="5" border="1">
              <tr style="background:#eee">
                <th>Requestor</th>
                <th>Company</th>
                <th>Created Date</th>
                <th>Age (Days)</th>
                <th>Tracking #</th>
              </tr>
              ${tableRows}
            </table>
          `;

          await this.emailService.sendMail({
            to,
            scheduledJobId: SCHEDULED_JOB_IDS.OPEN_SHIPPING_REQUESTS,
            subject: `Open Shipping Requests - ${openRequests.length} overdue`,
            html,
          });
        } else {
          this.logger.warn('No recipients configured for open-shipping-requests');
        }
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] open-shipping-requests -> ${openRequests.length} overdue requests in ${durationMs}ms`);

      return {
        id: 'open-shipping-requests',
        name: 'Open Shipping Requests Report',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${openRequests.length} overdue shipping requests processed.`,
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
      this.logger.error(`[${trigger}] open-shipping-requests failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] open-shipping-requests ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

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
}

import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';
import { SCHEDULED_JOB_IDS } from '../scheduled-job-ids';
import { ScheduledJobRecipientsService } from '../scheduled-job-recipients.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface PastDueRequest extends RowDataPacket {
  created_date: string;
  total_days: number;
  fs_scheduler_id: number | null;
  token: string;
  request_id: number;
}

@Injectable()
export class PastDueFieldServiceRequestsHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(PastDueFieldServiceRequestsHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly scheduledJobRecipientsService: ScheduledJobRecipientsService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly urlBuilder: UrlBuilder,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const rows = await this.mysqlService.query<PastDueRequest[]>(`
        SELECT a.created_date
          , DATEDIFF(CURDATE(), a.created_date) total_days
          , b.id fs_scheduler_id
          , a.token
          , a.id request_id
        FROM fs_request a
        LEFT JOIN fs_scheduler b ON b.request_id = a.id
        WHERE a.active = 1 AND b.id IS NULL
        HAVING total_days >= 3
      `);

      this.logger.log(`[${trigger}] past-due-field-service-requests -> found ${rows.length} rows`);

      if (rows.length === 0) {
        const durationMs = Date.now() - startedAtMs;
        this.logger.log(`[${trigger}] past-due-field-service-requests -> no past due requests, skipping email`);
        return {
          id: 'past-due-field-service-requests',
          name: 'Past Due Field Service Requests',
          trigger,
          ok: true,
          statusCode: 200,
          durationMs,
          message: 'No past due field service requests found.',
          lastRun: {
            startedAt: new Date(startedAtMs).toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs,
            status: 'success',
            triggerType: trigger,
            errorMessage: null,
          },
        };
      }

      const to = await this.scheduledJobRecipientsService.resolveSubscribedEmails(
        SCHEDULED_JOB_IDS.PAST_DUE_FIELD_SERVICE_REQUESTS,
      );

      this.logger.log(`[${trigger}] past-due-field-service-requests -> ${to.length} recipients: ${to.join(', ')}`);

      if (to.length === 0) {
        const durationMs = Date.now() - startedAtMs;
        this.logger.warn(
          `[${trigger}] past-due-field-service-requests -> no recipients configured for job past-due-field-service-requests`,
        );
        return {
          id: 'past-due-field-service-requests',
          name: 'Past Due Field Service Requests',
          trigger,
          ok: true,
          statusCode: 200,
          durationMs,
          message: `${rows.length} past due requests found but no recipients configured.`,
          lastRun: {
            startedAt: new Date(startedAtMs).toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs,
            status: 'success',
            triggerType: trigger,
            errorMessage: null,
          },
        };
      }

      const templateRows = rows.map((row) => ({
        requestId: row.request_id,
        createdDate: row.created_date,
        totalDaysOpen: row.total_days,
        link: this.urlBuilder.fieldService.requestEdit(row.request_id),
      }));

      const html = this.emailTemplateService.render('past-due-field-service-requests', {
        requestCount: rows.length,
        rows: templateRows,
      });

      await this.emailService.sendMail({
        to,
        scheduledJobId: SCHEDULED_JOB_IDS.PAST_DUE_FIELD_SERVICE_REQUESTS,
        subject: 'Field Service Overdue Requests',
        html,
      });

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(
        `[${trigger}] past-due-field-service-requests -> emailed ${rows.length} requests to ${to.length} recipients in ${durationMs}ms`,
      );

      return {
        id: 'past-due-field-service-requests',
        name: 'Past Due Field Service Requests',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${rows.length} past due field service requests emailed to ${to.length} recipients.`,
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
      this.logger.error(`[${trigger}] past-due-field-service-requests failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] past-due-field-service-requests ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: 'past-due-field-service-requests',
        name: 'Past Due Field Service Requests',
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
import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { ScheduledJobRecipientsService } from '../scheduled-job-recipients.service';
import { SCHEDULED_JOB_IDS } from '../scheduled-job-ids';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

@Injectable()
export class FsJobReportMorningHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(FsJobReportMorningHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly scheduledJobRecipientsService: ScheduledJobRecipientsService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const sentTo = await this.sendFieldServiceJobReportEmail();

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] fs-job-report -> sent to ${sentTo.length} recipients in ${durationMs}ms`);

      return {
        id: SCHEDULED_JOB_IDS.FS_JOB_REPORT,
        name: 'Field Service Job Report',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `Field service job report sent to ${sentTo.length} recipients.`,
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
      this.logger.error(`[${trigger}] fs-job-report failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] fs-job-report ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: SCHEDULED_JOB_IDS.FS_JOB_REPORT,
        name: 'Field Service Job Report',
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

  private async sendFieldServiceJobReportEmail(): Promise<string[]> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(`
      SELECT *
      FROM fs_scheduler_view
      WHERE request_date BETWEEN LAST_DAY(CURDATE() - INTERVAL 2 MONTH) + INTERVAL 1 DAY
        AND LAST_DAY(CURDATE() + INTERVAL 1 MONTH)
      ORDER BY request_date ASC
    `);

    const recipients = await this.scheduledJobRecipientsService.resolveSubscribedEmails(
      SCHEDULED_JOB_IDS.FS_JOB_REPORT,
    );
    if (!recipients.length) {
      this.logger.warn('No recipients configured for fs-job-report');
      return [];
    }

    const csv = this.toCsv(rows);
    const monthStart = this.formatDate(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
    const monthEndDate = new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);
    const monthEnd = this.formatDate(monthEndDate);

    const html = this.emailTemplateService.render('fs-job-report', {
      monthStart,
      monthEnd,
      recipientCount: recipients.length,
    });

    await this.emailService.sendMail({
      to: recipients,
      scheduledJobId: SCHEDULED_JOB_IDS.FS_JOB_REPORT,
      subject: 'Field Service Job Report',
      text: `Field Service Job Report - ${monthStart} to ${monthEnd}`,
      html,
      attachments: [
        {
          filename: 'field_service_jobs.csv',
          content: csv,
          contentType: 'text/csv; charset=utf-8',
        },
      ],
    });

    return recipients;
  }

  private toCsv(rows: RowDataPacket[]): string {
    if (!rows.length) {
      return '';
    }

    const headers = Object.keys(rows[0] as Record<string, unknown>);
    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }

      const text = String(value).replace(/"/g, '""');
      return `"${text}"`;
    };

    const lines: string[] = [];
    lines.push(headers.map((header) => escapeCsv(header)).join(','));

    for (const row of rows as Array<Record<string, unknown>>) {
      lines.push(headers.map((header) => escapeCsv(row[header])).join(','));
    }

    return lines.join('\n');
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

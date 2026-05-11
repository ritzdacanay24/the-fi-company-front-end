import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface FieldServiceJob extends RowDataPacket {
  id: number;
  request_id: number;
  request_date: string;
  start_time: string;
  property: string;
  service_type: string;
  email: string;
  requested_by: string;
  token: string;
}

@Injectable()
export class FsJobNoticeHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(FsJobNoticeHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly urlBuilder: UrlBuilder,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const sentCount = await this.sendFieldServiceNoticeEmails();

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] fs-job-notice -> sent ${sentCount} notices in ${durationMs}ms`);

      return {
        id: 'fs-job-notice',
        name: 'Field Service Job Notice',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${sentCount} field service appointment notices sent.`,
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
      this.logger.error(`[${trigger}] fs-job-notice failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] fs-job-notice ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: 'fs-job-notice',
        name: 'Field Service Job Notice',
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

  private async sendFieldServiceNoticeEmails(): Promise<number> {
    const jobs = await this.mysqlService.query<FieldServiceJob[]>(`
      SELECT
        fs.id,
        fs.request_id,
        fs.request_date,
        fs.start_time,
        fs.property,
        fs.service_type,
        req.email,
        req.requested_by,
        req.token
      FROM fs_scheduler fs
      LEFT JOIN fs_request req ON req.id = fs.request_id
      WHERE fs.request_date BETWEEN DATE_FORMAT(NOW(), '%Y-%m-%d')
        AND DATE_ADD(DATE_FORMAT(NOW(), '%Y-%m-%d'), INTERVAL 2 DAY)
      AND req.email IS NOT NULL
      AND fs.notice_email_date IS NULL
      AND fs.active = 1
      AND fs.status = 'Confirmed'
      ORDER BY fs.request_date ASC, fs.start_time ASC
    `);

    let sentCount = 0;
    const noticeDetails: Array<Record<string, unknown>> = [];
    const timeNow = new Date().toISOString().slice(0, 19).replace('T', ' ');

    for (const job of jobs) {
      const jobId = job.id;
      const requestId = job.request_id;
      const requestDate = job.request_date;
      const startTime = job.start_time;
      const property = job.property;
      const email = String(job.email ?? '').trim();
      const requestedBy = job.requested_by as string;
      const token = job.token as string;

      try {
        if (!email || !email.includes('@')) {
          this.logger.warn(`Skipping fs-job-notice for job ${jobId}: invalid requester email '${email}'`);
          continue;
        }

        const link = this.urlBuilder.fieldService.requestConfirmation(token);
        const html = this.emailTemplateService.render('fs-job-notice', {
          requestId,
          link,
          requestedBy,
          requestDate,
          startTime,
          property,
        });

        await this.emailService.sendMail({
          to: email,
          subject: `Appointment Notice - Request ID ${requestId}`,
          html,
        });

        await this.mysqlService.query(
          `UPDATE fs_scheduler SET notice_email_date = ? WHERE id = ?`,
          [timeNow, jobId],
        );

        sentCount++;
        noticeDetails.push({
          request_id: requestId,
          request_date: requestDate,
          start_time: startTime,
          property,
          requested_by: requestedBy,
          email_sent: timeNow,
        });
      } catch (error) {
        this.logger.error(`Failed to send notice email for job ${jobId}:`, error);
      }
    }

    if (noticeDetails.length > 0) {
      try {
        const summaryHtml = this.emailTemplateService.render('fs-job-notice-summary', {
          details: noticeDetails,
          totalNotices: noticeDetails.length,
        });
        await this.emailService.sendMail({
          to: 'schedulinglv@the-fi-company.com',
          subject: 'Field Service Notice Email Summary',
          html: summaryHtml,
        });
      } catch (error) {
        this.logger.error('Failed to send scheduling team summary:', error);
      }
    }

    return sentCount;
  }
}

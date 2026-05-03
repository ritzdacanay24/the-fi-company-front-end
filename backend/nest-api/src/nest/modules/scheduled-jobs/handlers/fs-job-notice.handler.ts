import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
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
      this.logger.error(`[${trigger}] fs-job-notice failed in ${durationMs}ms: ${message}`);

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
      const email = job.email as string;
      const requestedBy = job.requested_by as string;
      const token = job.token as string;

      try {
        const link = this.urlBuilder.fieldService.requestConfirmation(token);
        const message = `
          <html>
            <body>
              <p>Request ID: ${requestId} <br/>
              View Request: <a href="${link}" target="_blank">Request</a> <br/><br/>
              Dear ${requestedBy}, <br/> <br/>
              This email is to confirm your upcoming appointment on ${requestDate} at ${startTime} at ${property}. 
              Please let us know if you have any questions or concerns before the day of your appointment.<br/><br/>
              Also, please note that our cancellation policy states that all cancellations must be made at least 48 hours 
              in advance or a full fee may be charged.<br/><br/>
              We look forward to seeing you soon!<br/><br/>
              Sincerely,<br/>
              The Fi Company
            </p>
            </body>
          </html>
        `;

        await this.emailService.sendMail({
          to: email,
          subject: `Appointment Notice - Request ID ${requestId}`,
          html: message,
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
        const summaryHtml = this.buildFieldServiceNoticeSummary(noticeDetails);
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

  private buildFieldServiceNoticeSummary(details: Array<Record<string, unknown>>): string {
    let html = `
      <html><body>
      <p><strong>Field Service Notice Email Summary</strong></p>
      <table rules="all" style="border-color: #666; border-collapse: collapse;" cellpadding="5" border="1">
      <tr style="background: #eee;">
        <td><strong>Request ID</strong></td>
        <td><strong>Request Date</strong></td>
        <td><strong>Start Time</strong></td>
        <td><strong>Requested By</strong></td>
        <td><strong>Property</strong></td>
        <td><strong>Email Sent</strong></td>
      </tr>
    `;

    for (const detail of details) {
      html += `
      <tr>
        <td>${detail['request_id']}</td>
        <td>${detail['request_date']}</td>
        <td>${detail['start_time']}</td>
        <td>${detail['requested_by']}</td>
        <td>${detail['property']}</td>
        <td>${detail['email_sent']}</td>
      </tr>
      `;
    }

    html += `
      </table>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        Total notices sent: ${details.length}
      </p>
      </body></html>
    `;

    return html;
  }
}

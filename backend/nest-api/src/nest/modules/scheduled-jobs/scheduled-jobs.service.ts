import { Injectable, Logger } from '@nestjs/common';
import { request as httpsRequest } from 'https';
import { URL } from 'url';
import { RowDataPacket } from 'mysql2/promise';
import { EmailNotificationService } from '../email-notification/email-notification.service';
import { GraphicsProductionService } from '../graphics-production/graphics-production.service';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { SCHEDULED_JOB_DEFINITIONS } from './scheduled-jobs.definitions';

export type ScheduledJobRunStatus = 'success' | 'failure';

export interface ScheduledJobLastRun {
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  status: ScheduledJobRunStatus;
  triggerType: 'manual' | 'cron';
  errorMessage: string | null;
}

export interface ScheduledJobDto {
  id: string;
  name: string;
  cron: string;
  url: string;
  active: boolean;
  note?: string;
  lastRun?: ScheduledJobLastRun;
  command: string;
  source: 'nest-cron';
  runnerEnabled: boolean;
}

export interface ScheduledJobRunResultDto {
  id: string;
  name: string;
  trigger: 'manual' | 'cron';
  ok: boolean;
  statusCode: number;
  durationMs: number;
  message: string;
  lastRun?: ScheduledJobLastRun;
  url?: string;
  responseSnippet?: string;
}

interface ExecuteGetResult {
  statusCode: number;
  responseSnippet?: string;
}

const LEGACY_ENDPOINT_BY_JOB_ID: Record<string, string> = {
  'graphics-due-today-report': 'https://dashboard.eye-fi.com/tasks/graphicsDueTodayReport.php?runDaily=1',
  'dashboard-performance': 'https://dashboard.eye-fi.com/tasks/dashPerformance.php',
  'dropin-workorder-emails': 'https://dashboard.eye-fi.com/tasks/email_dropInWorkOrder.php',
  'clean-db-sessions': 'https://dashboard.eye-fi.com/tasks/cleanDbSessions.php',
  'clean-tokens': 'https://dashboard.eye-fi.com/tasks/cleanTokens.php',
  'clean-users': 'https://dashboard.eye-fi.com/tasks/cleanUsers.php',
  'total-shipped-orders': 'https://dashboard.eye-fi.com/tasks/total_shipped_orders.php',
  'shipping-changes': 'https://dashboard.eye-fi.com/tasks/shipping_changes.php?runShippingChanges=1',
  'overdue-orders': 'https://dashboard.eye-fi.com/tasks/overDueOrders.php',
  'field-service-old-workorders': 'https://dashboard.eye-fi.com/tasks/fieldServiceOldWorkOrders.php',
  'open-shipping-requests': 'https://dashboard.eye-fi.com/tasks/shippingChanges.php?runOpenShippingRequests=1',
  'graphics-work-order': 'https://dashboard.eye-fi.com/tasks/createGraphicsWorkOrder.class.php',
  'certificate-of-compliance': 'https://dashboard.eye-fi.com/tasks/certificateOfCompliance.php',
  'vehicle-expiration-email': 'https://dashboard.eye-fi.com/tasks/VehicleExpirationEmail.php',
  'daily-report-insert': 'https://dashboard.eye-fi.com/tasks/dailyReport.php?insert=1',
  'completed-production-orders': 'https://dashboard.eye-fi.com/tasks/completedProductionOrders.php',
  'inspection-email': 'https://dashboard.eye-fi.com/tasks/inspection/emailInspection.php',
  'fs-job-report-morning': 'https://dashboard.eye-fi.com/tasks/fsJobReport.php',
  'fs-job-report-evening': 'https://dashboard.eye-fi.com/tasks/fsJobReport.php',
  'past-due-field-service-requests': 'https://dashboard.eye-fi.com/tasks/fieldService/pastDueRequests.php',
  'lnw-delivery': 'https://dashboard.eye-fi.com/tasks/lnwDelivery.php',
  'fs-job-notice': 'https://dashboard.eye-fi.com/tasks/fieldService/fsJobNotice.php',
};

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);
  private readonly requestTimeoutMs = Number(process.env.SCHEDULED_JOBS_TIMEOUT_MS || 120000);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly graphicsProductionService: GraphicsProductionService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  isRunnerEnabled(): boolean {
    const raw = String(process.env.NEST_SCHEDULED_JOBS_ENABLED ?? 'false').toLowerCase().trim();
    return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
  }

  async listJobs(): Promise<ScheduledJobDto[]> {
    const runnerEnabled = this.isRunnerEnabled();

    const rows = await this.mysqlService.query<RowDataPacket[]>(`
      SELECT
        r.job_name,
        r.trigger_type,
        r.status,
        r.started_at,
        r.finished_at,
        r.duration_ms,
        r.error_message
      FROM scheduled_job_run r
      INNER JOIN (
        SELECT job_name, MAX(id) AS max_id
        FROM scheduled_job_run
        GROUP BY job_name
      ) latest ON r.job_name = latest.job_name AND r.id = latest.max_id
    `);

    const lastRunByJobId = new Map<string, ScheduledJobLastRun>();
    for (const row of rows) {
      const startedAt = this.normalizeDbDateToIso(row['started_at']);
      if (!startedAt) {
        continue;
      }

      lastRunByJobId.set(row['job_name'] as string, {
        startedAt,
        finishedAt: this.normalizeDbDateToIso(row['finished_at']),
        durationMs: row['duration_ms'] as number | null,
        status: row['status'] as ScheduledJobRunStatus,
        triggerType: row['trigger_type'] as 'manual' | 'cron',
        errorMessage: row['error_message'] as string | null,
      });
    }

    return SCHEDULED_JOB_DEFINITIONS.map((job) => this.toScheduledJobDto(job, runnerEnabled, lastRunByJobId.get(job.id)));
  }

  updateJob(
    id: string,
    data: { cron: string; active: boolean; note?: string }
  ): ScheduledJobDto | null {
    const jobIndex = SCHEDULED_JOB_DEFINITIONS.findIndex((row) => row.id === id);
    if (jobIndex === -1) {
      return null;
    }

    const job = SCHEDULED_JOB_DEFINITIONS[jobIndex];
    SCHEDULED_JOB_DEFINITIONS[jobIndex] = {
      ...job,
      cron: data.cron,
      active: data.active,
      note: data.note,
    };

    const runnerEnabled = this.isRunnerEnabled();
    return this.toScheduledJobDto(SCHEDULED_JOB_DEFINITIONS[jobIndex], runnerEnabled, undefined);
  }

  async runJobById(
    id: string,
    trigger: 'manual' | 'cron',
  ): Promise<ScheduledJobRunResultDto> {
    const job = SCHEDULED_JOB_DEFINITIONS.find((row) => row.id === id);
    if (!job) {
      return {
        id,
        name: 'Unknown Job',
        trigger,
        ok: false,
        statusCode: 404,
        durationMs: 0,
        message: `Scheduled job not found: ${id}`,
      };
    }

    const startedAtMs = Date.now();
    const startedAtIso = new Date(startedAtMs).toISOString();
    let runId: number | null = null;

    try {
      const [insertResult] = await this.mysqlService.query<RowDataPacket[]>(
        `INSERT INTO scheduled_job_run (job_name, trigger_type, status, started_at) VALUES (?, ?, 'success', NOW())`,
        [job.id, trigger],
      ) as any;
      runId = (insertResult as any)?.insertId ?? null;
    } catch (dbErr) {
      this.logger.warn(`[${trigger}] ${job.id} - could not insert run record: ${dbErr}`);
    }

    const finishRun = async (status: ScheduledJobRunStatus, durationMs: number, errorMessage?: string): Promise<ScheduledJobLastRun> => {
      const finishedAtIso = new Date().toISOString();
      if (runId !== null) {
        try {
          await this.mysqlService.query(
            `UPDATE scheduled_job_run SET status = ?, finished_at = NOW(), duration_ms = ?, error_message = ? WHERE id = ?`,
            [status, durationMs, errorMessage ?? null, runId],
          );
        } catch (dbErr) {
          this.logger.warn(`[${trigger}] ${job.id} - could not update run record: ${dbErr}`);
        }
      }
      return {
        startedAt: startedAtIso,
        finishedAt: finishedAtIso,
        durationMs,
        status,
        triggerType: trigger,
        errorMessage: errorMessage ?? null,
      };
    };

    try {
      if (job.id === 'graphics-due-today-report') {
        const dueToday = await this.graphicsProductionService.getDueTodayReport();
        const durationMs = Date.now() - startedAtMs;
        const responseSnippet = `totalOrders=${dueToday.totalOrders}`;
        this.logger.log(`[${trigger}] ${job.id} -> local query in ${durationMs}ms (${responseSnippet})`);
        const lastRun = await finishRun('success', durationMs);

        return {
          id: job.id,
          name: job.name,
          trigger,
          ok: true,
          statusCode: 200,
          durationMs,
          message: `Job ${job.name} completed locally in Nest (${responseSnippet}).`,
          lastRun,
          url: 'nest://graphics-production/getDueTodayReport',
          responseSnippet,
        };
      }

      if (job.id === 'fs-job-report-morning' || job.id === 'fs-job-report-evening') {
        const sentTo = await this.sendFieldServiceJobReportEmail();
        const durationMs = Date.now() - startedAtMs;
        const responseSnippet = `recipients=${sentTo.length}`;
        this.logger.log(`[${trigger}] ${job.id} -> local mail in ${durationMs}ms (${responseSnippet})`);
        const lastRun = await finishRun('success', durationMs);

        return {
          id: job.id,
          name: job.name,
          trigger,
          ok: true,
          statusCode: 200,
          durationMs,
          message: `Job ${job.name} completed locally in Nest (${responseSnippet}).`,
          lastRun,
          url: job.url,
          responseSnippet,
        };
      }

      if (job.id === 'fs-job-notice') {
        const noticesSent = await this.sendFieldServiceNoticeEmails();
        const durationMs = Date.now() - startedAtMs;
        const responseSnippet = `notices=${noticesSent}`;
        this.logger.log(`[${trigger}] ${job.id} -> local mail in ${durationMs}ms (${responseSnippet})`);
        const lastRun = await finishRun('success', durationMs);

        return {
          id: job.id,
          name: job.name,
          trigger,
          ok: true,
          statusCode: 200,
          durationMs,
          message: `Job ${job.name} completed locally in Nest (${responseSnippet}).`,
          lastRun,
          url: job.url,
          responseSnippet,
        };
      }

      const targetUrl = LEGACY_ENDPOINT_BY_JOB_ID[job.id];
      if (!targetUrl) {
        const durationMs = Date.now() - startedAtMs;
        const lastRun = await finishRun('failure', durationMs, `No executor registered for ${job.id}.`);
        return {
          id: job.id,
          name: job.name,
          trigger,
          ok: false,
          statusCode: 501,
          durationMs,
          message: `No executor registered for ${job.id}.`,
          lastRun,
          url: job.url,
        };
      }

      const { statusCode, responseSnippet } = await this.executeGet(targetUrl);
      const durationMs = Date.now() - startedAtMs;
      const ok = statusCode >= 200 && statusCode < 300;
      const message = ok
        ? `Job ${job.name} completed successfully (${statusCode}).`
        : `Job ${job.name} returned non-success status (${statusCode})${responseSnippet ? `: ${responseSnippet}` : '.'}`;

      if (ok) {
        this.logger.log(`[${trigger}] ${job.id} -> ${statusCode} in ${durationMs}ms`);
      } else {
        this.logger.warn(`[${trigger}] ${job.id} -> ${statusCode} in ${durationMs}ms`);
      }

      const lastRun = await finishRun(ok ? 'success' : 'failure', durationMs, ok ? undefined : message);

      return {
        id: job.id,
        name: job.name,
        trigger,
        ok,
        statusCode,
        durationMs,
        message,
        lastRun,
        url: job.url,
        responseSnippet,
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - startedAtMs;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${trigger}] ${job.id} failed in ${durationMs}ms: ${message}`);
      const lastRun = await finishRun('failure', durationMs, message);

      return {
        id: job.id,
        name: job.name,
        trigger,
        ok: false,
        statusCode: 500,
        durationMs,
        message,
        lastRun,
        url: job.url,
      };
    }
  }

  private toScheduledJobDto(
    job: (typeof SCHEDULED_JOB_DEFINITIONS)[number],
    runnerEnabled: boolean,
    lastRun?: ScheduledJobLastRun,
  ): ScheduledJobDto {
    return {
      ...job,
      lastRun,
      command: 'NEST_LOCAL_HANDLER scheduledJobsService.runJobById(jobId)',
      source: 'nest-cron' as const,
      runnerEnabled,
    };
  }

  private normalizeDbDateToIso(value: unknown): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    return null;
  }

  async runJobIfEnabled(id: string): Promise<void> {
    if (!this.isRunnerEnabled()) {
      return;
    }

    const job = SCHEDULED_JOB_DEFINITIONS.find((row) => row.id === id);
    if (!job || !job.active) {
      return;
    }

    await this.runJobById(id, 'cron');
  }

  private async executeGet(url: string): Promise<ExecuteGetResult> {
    const parsed = new URL(url);
    const maxSnippetBytes = 1000;

    return new Promise<ExecuteGetResult>((resolve, reject) => {
      const req = httpsRequest(
        {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port || undefined,
          path: `${parsed.pathname}${parsed.search}`,
          method: 'GET',
          timeout: this.requestTimeoutMs,
        },
        (res) => {
          const statusCode = res.statusCode || 0;
          const chunks: Buffer[] = [];
          let collectedBytes = 0;

          res.on('data', (chunk: Buffer | string) => {
            if (collectedBytes >= maxSnippetBytes) {
              return;
            }

            const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            const remaining = maxSnippetBytes - collectedBytes;
            if (bufferChunk.length <= remaining) {
              chunks.push(bufferChunk);
              collectedBytes += bufferChunk.length;
              return;
            }

            chunks.push(bufferChunk.subarray(0, remaining));
            collectedBytes += remaining;
          });

          res.on('end', () => {
            const rawSnippet = chunks.length
              ? Buffer.concat(chunks).toString('utf-8').replace(/\s+/g, ' ').trim()
              : undefined;

            resolve({
              statusCode,
              responseSnippet: rawSnippet?.slice(0, 250),
            });
          });
        },
      );

      req.on('timeout', () => {
        req.destroy(new Error(`Request timeout after ${this.requestTimeoutMs}ms`));
      });

      req.on('error', (error) => reject(error));
      req.end();
    });
  }

  private async sendFieldServiceJobReportEmail(): Promise<string[]> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(`
      SELECT *
      FROM fs_scheduler_view
      WHERE request_date BETWEEN LAST_DAY(CURDATE() - INTERVAL 2 MONTH) + INTERVAL 1 DAY
        AND LAST_DAY(CURDATE() + INTERVAL 1 MONTH)
      ORDER BY request_date ASC
    `);

    const recipients = await this.resolveNotificationEmails('field_serivce_copy_of_report');
    if (!recipients.length) {
      this.logger.warn('No recipients configured for field_serivce_copy_of_report');
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

  private async resolveNotificationEmails(location: string): Promise<string[]> {
    const rows = await this.emailNotificationService.find({ location });
    const recipients = new Set<string>();

    for (const row of rows as Array<Record<string, unknown>>) {
      const values = [row['email'], row['notification_emails']]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      for (const email of values) {
        recipients.add(email);
      }
    }

    return Array.from(recipients);
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

  private async sendFieldServiceNoticeEmails(): Promise<number> {
      const jobs = await this.mysqlService.query<RowDataPacket[]>(`
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

      for (const job of jobs as Array<Record<string, unknown>>) {
        const jobId = job['id'];
        const requestId = job['request_id'];
        const requestDate = job['request_date'];
        const startTime = job['start_time'];
        const property = job['property'];
        const email = job['email'] as string;
        const requestedBy = job['requested_by'] as string;
        const token = job['token'] as string;

        try {
          const link = `https://dashboard.eye-fi.com/request?token=${token}`;
          const message = `
            Request ID: ${requestId} <br/>
            View Request: <a href="${link}" target="_blank">Request</a> <br/><br/>
            Dear ${requestedBy}, <br/> <br/>
            This email is to confirm your upcoming appointment on ${requestDate} at ${startTime} at ${property}. Please let us know if you have any questions or concerns before the day of your appointment.<br/><br/>
            Also, please note that our cancellation policy states that all cancellations must be made at least 48 hours in advance or a full fee may be charged.<br/><br/>
            We look forward to seeing you soon!<br/><br/>
            Sincerely,<br/>
            The Fi Company
          `;

          await this.emailService.sendMail({
            to: email,
            subject: `Appointment Notice - Request ID ${requestId}`,
            html: message,
          });

          await this.mysqlService.query(`
            UPDATE fs_scheduler
            SET notice_email_date = ?
            WHERE id = ?
          `, [timeNow, jobId]);

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

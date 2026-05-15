import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface OpenChecklistInstanceRow extends RowDataPacket {
  id: number;
  work_order_number: string | null;
  serial_number: string | null;
  status: string | null;
  progress_percentage: number | string | null;
  owner_name: string | null;
  operator_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

@Injectable()
export class OpenChecklistInstancesLast3DaysHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(OpenChecklistInstancesLast3DaysHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly configService: ConfigService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const rows = await this.mysqlService.query<OpenChecklistInstanceRow[]>(`
        SELECT
          ci.id,
          ci.work_order_number,
          ci.serial_number,
          ci.status,
          ci.progress_percentage,
          ci.owner_name,
          ci.operator_name,
          ci.created_at,
          ci.updated_at
        FROM checklist_instances ci
        WHERE ci.status NOT IN ('submitted', 'archived')
          AND ci.created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
        ORDER BY ci.created_at DESC
      `);

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(
        `[${trigger}] open-checklist-instances-last-3-days -> found ${rows.length} open checklist instance(s) older than 3 days in ${durationMs}ms`,
      );

      const shouldSendReport = rows.length > 0 || trigger === 'manual';
      if (shouldSendReport) {
        const recipientRows = await this.emailNotificationService.find({
          location: 'open_checklist_instances_last_3_days',
        });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        const toFinal = to.length > 0 ? to : ['ritz.dacanay@the-fi-company.com'];
        const baseUrl = String(this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL')).replace(/\/+$/, '');
        const reportLink = `${baseUrl}/inspection-checklist/management`;
        const templateRows = rows.map((row) => ({
          progressPercent: this.normalizeProgress(row.progress_percentage),
          progressWidth: `${this.normalizeProgress(row.progress_percentage)}%`,
          progressColor: this.getProgressColor(this.normalizeProgress(row.progress_percentage)),
          id: row.id,
          workOrderNumber: row.work_order_number || '-',
          serialNumber: row.serial_number || '-',
          status: row.status || '-',
          ownerOperator: row.owner_name || row.operator_name || '-',
          createdAt: this.toDateOnly(row.created_at),
          updatedAt: this.toDateOnly(row.updated_at),
        }));

        const html = this.emailTemplateService.render('open-checklist-instances-last-3-days', {
          totalOpenInstances: rows.length,
          reportLink,
          hasRows: templateRows.length > 0,
          rows: templateRows,
        });

        await this.emailService.sendMail({
          to: toFinal,
          subject: `Open Checklist Instances (Older Than 3 Days) - ${rows.length} found`,
          html,
        });
      }

      return {
        id: 'open-checklist-instances-last-3-days',
        name: 'Open Checklist Instances (Older Than 3 Days)',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${rows.length} open checklist instance(s) older than 3 days found.`,
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
      this.logger.error(`[${trigger}] open-checklist-instances-last-3-days failed in ${durationMs}ms: ${message}`);

      return {
        id: 'open-checklist-instances-last-3-days',
        name: 'Open Checklist Instances (Older Than 3 Days)',
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

  private normalizeProgress(value: number | string | null): number {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    if (parsed < 0) {
      return 0;
    }

    if (parsed > 100) {
      return 100;
    }

    return Math.round(parsed);
  }

  private getProgressColor(progress: number): string {
    if (progress >= 80) {
      return '#198754';
    }

    if (progress >= 40) {
      return '#fd7e14';
    }

    return '#dc3545';
  }

  private toDateOnly(value: string | null): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return '-';
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }

    return parsed.toLocaleDateString('en-US');
  }
}
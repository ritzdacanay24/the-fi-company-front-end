import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { SCHEDULED_JOB_IDS } from '../scheduled-job-ids';
import { ScheduledJobRecipientsService } from '../scheduled-job-recipients.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface OverdueSafetyIncidentRow extends RowDataPacket {
  id: number;
  type_of_incident: string | null;
  type_of_incident_other: string | null;
  date_of_incident: string | null;
  time_of_incident: string | null;
  status: string | null;
  corrective_action_owner: string | null;
  age: number;
}

@Injectable()
export class OverdueSafetyIncidentHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(OverdueSafetyIncidentHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly scheduledJobRecipientsService: ScheduledJobRecipientsService,
    private readonly configService: ConfigService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const rows = await this.mysqlService.query<OverdueSafetyIncidentRow[]>(`
        SELECT
          id,
          type_of_incident,
          type_of_incident_other,
          date_of_incident,
          time_of_incident,
          status,
          corrective_action_owner,
          DATEDIFF(CURDATE(), date_of_incident) AS age
        FROM eyefidb.safety_incident
        WHERE status <> 'Closed'
          AND archived_at IS NULL
          AND DATEDIFF(CURDATE(), date_of_incident) > 7
        ORDER BY date_of_incident ASC
      `);

      this.logger.log(`[${trigger}] overdue-safety-incident -> found ${rows.length} open safety incidents older than 7 days`);

      const shouldSendReport = rows.length > 0 || trigger === 'manual';
      if (shouldSendReport) {
        const toFinal = await this.scheduledJobRecipientsService.resolveSubscribedEmails(
          SCHEDULED_JOB_IDS.OVERDUE_SAFETY_INCIDENT,
        );
        const baseUrl = String(this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL')).replace(/\/+$/, '');
        const reportLink = `${baseUrl}/operations/forms/safety-incident/list?selectedViewType=Open&isAll=true`;

        const templateRows = rows.map((row) => ({
          id: row.id,
          incidentType:
            row.type_of_incident === 'Other'
              ? row.type_of_incident_other || 'Other'
              : row.type_of_incident || '-',
          incidentDate: row.date_of_incident || '-',
          incidentTime: row.time_of_incident || '-',
          status: row.status || '-',
          age: Number(row.age || 0),
          correctiveActionOwner: row.corrective_action_owner || '-',
          viewLink: `${baseUrl}/operations/forms/safety-incident/edit?selectedViewType=Open&isAll=true&id=${row.id}`,
        }));

        const html = this.emailTemplateService.render('overdue-safety-incident', {
          totalOpenIncidents: rows.length,
          reportLink,
          hasRows: templateRows.length > 0,
          rows: templateRows,
        });

        if (toFinal.length > 0) {
          await this.emailService.sendMail({
            to: toFinal,
            scheduledJobId: SCHEDULED_JOB_IDS.OVERDUE_SAFETY_INCIDENT,
            subject: 'Urgent: Action Needed on Open Safety Incidents',
            html,
          });
        } else {
          this.logger.warn('No recipients configured for overdue-safety-incident');
        }
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] overdue-safety-incident -> ${rows.length} incidents processed in ${durationMs}ms`);

      return {
        id: 'overdue-safety-incident',
        name: 'Overdue Safety Incidents',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${rows.length} open safety incidents processed.`,
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
      this.logger.error(`[${trigger}] overdue-safety-incident failed in ${durationMs}ms: ${message}`);

      return {
        id: 'overdue-safety-incident',
        name: 'Overdue Safety Incidents',
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

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { SCHEDULED_JOB_IDS } from '../scheduled-job-ids';
import { ScheduledJobRecipientsService } from '../scheduled-job-recipients.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface OverdueQirRow extends RowDataPacket {
  id: number;
  stakeholder: string | null;
  type1: string | null;
  priority: string | null;
  createdDate: string | null;
  status: string | null;
  eyefiSerialNumber: string | null;
  age: number;
}

@Injectable()
export class OverdueQirHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(OverdueQirHandler.name);

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
      const rows = await this.mysqlService.query<OverdueQirRow[]>(`
        SELECT
          id,
          stakeholder,
          type1,
          priority,
          createdDate,
          status,
          eyefiSerialNumber,
          DATEDIFF(CURDATE(), createdDate) AS age
        FROM eyefidb.qa_capaRequest
        WHERE status NOT IN ('Closed', 'Rejected')
          AND active = 1
          AND DATEDIFF(CURDATE(), createdDate) > 7
        ORDER BY createdDate ASC
      `);

      this.logger.log(`[${trigger}] overdue-qir -> found ${rows.length} open quality incidents older than 7 days`);

      const shouldSendReport = rows.length > 0 || trigger === 'manual';
      if (shouldSendReport) {
        const toFinal = await this.scheduledJobRecipientsService.resolveSubscribedEmails(SCHEDULED_JOB_IDS.OVERDUE_QIR);
        const baseUrl = String(this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL')).replace(/\/+$/, '');
        const reportLink = `${baseUrl}/quality/qir/list?selectedViewType=Open&isAll=true`;

        const templateRows = rows.map((row) => ({
          id: row.id,
          stakeholder: row.stakeholder || '-',
          type: row.type1 || '-',
          priority: row.priority || '-',
          createdDate: row.createdDate || '-',
          status: row.status || '-',
          age: Number(row.age || 0),
          serialNumber: row.eyefiSerialNumber || '-',
          viewLink: `${baseUrl}/quality/qir/edit?selectedViewType=Open&isAll=true&id=${row.id}`,
        }));

        const html = this.emailTemplateService.render('overdue-qir', {
          totalOpenIncidents: rows.length,
          reportLink,
          hasRows: templateRows.length > 0,
          rows: templateRows,
        });

        if (toFinal.length > 0) {
          await this.emailService.sendMail({
            to: toFinal,
            scheduledJobId: SCHEDULED_JOB_IDS.OVERDUE_QIR,
            subject: 'Action Required: Review of Open Quality Incidents',
            html,
          });
        } else {
          this.logger.warn('No recipients configured for overdue-qir');
        }
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] overdue-qir -> ${rows.length} incidents processed in ${durationMs}ms`);

      return {
        id: 'overdue-qir',
        name: 'Overdue Quality Incidents',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${rows.length} open quality incidents processed.`,
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
      this.logger.error(`[${trigger}] overdue-qir failed in ${durationMs}ms: ${message}`);

      return {
        id: 'overdue-qir',
        name: 'Overdue Quality Incidents',
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

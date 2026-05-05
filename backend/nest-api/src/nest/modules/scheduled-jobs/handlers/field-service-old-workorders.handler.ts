import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface OldWorkOrderRow extends RowDataPacket {
  fs_scheduler_id: number;
  id: number;
  createdDate: string;
  userId: number;
  dateSubmitted: string | null;
  request_date: string;
  status: string;
  service_type: string;
  customer: string;
  property: string;
  sign_theme: string;
  installers: string;
  age: string;
}

@Injectable()
export class FieldServiceOldWorkOrdersHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(FieldServiceOldWorkOrdersHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const rows = await this.mysqlService.query<OldWorkOrderRow[]>(`
        SELECT a.fs_scheduler_id
          , a.id
          , a.createdDate
          , a.userId
          , a.dateSubmitted
          , b.request_date
          , b.status
          , b.service_type
          , b.customer
          , b.property
          , b.sign_theme
          , (
              SELECT GROUP_CONCAT(t.user ORDER BY t.lead_tech DESC SEPARATOR ', ')
              FROM eyefidb.fs_tech_assignments t
              WHERE t.fs_id = b.id
            ) installers
          , CONCAT(DATEDIFF(NOW(), a.createdDate), ' day(s) old') age
        FROM eyefidb.fs_workOrder a
        JOIN eyefidb.fs_scheduler b ON b.id = a.fs_scheduler_id
        WHERE b.active = 1
          AND a.dateSubmitted IS NULL
          AND DATEDIFF(NOW(), a.createdDate) > 7
        ORDER BY a.createdDate DESC
      `);

      this.logger.log(`[${trigger}] field-service-old-workorders -> found ${rows.length} overdue WOs`);

      const shouldSendReport = rows.length > 0 || trigger === 'manual';
      if (shouldSendReport) {
        const recipientRows = await this.emailNotificationService.find({ location: 'overdue_field_service_workorder' });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        const toFinal = to.length > 0 ? to : ['ritz.dacanay@the-fi-company.com'];

        const templateRows = rows.map((row) => ({
          fsSchedulerId: row.fs_scheduler_id,
          ticketId: row.id,
          createdDate: row.createdDate,
          status: row.status,
          serviceType: row.service_type,
          customer: row.customer,
          property: row.property,
          signTheme: row.sign_theme,
          installers: row.installers ?? '',
          age: row.age,
        }));

        const html = this.emailTemplateService.render('field-service-old-workorders', {
          totalOverdue: rows.length,
          hasRows: rows.length > 0,
          rows: templateRows,
        });

        await this.emailService.sendMail({
          to: toFinal,
          subject: 'Action Needed on Field Service Open Work Orders',
          html,
        });
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] field-service-old-workorders -> ${rows.length} overdue WOs processed in ${durationMs}ms`);

      return {
        id: 'field-service-old-workorders',
        name: 'Field Service Old Work Orders',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${rows.length} overdue work orders processed.`,
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
      this.logger.error(`[${trigger}] field-service-old-workorders failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] field-service-old-workorders ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: 'field-service-old-workorders',
        name: 'Field Service Old Work Orders',
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

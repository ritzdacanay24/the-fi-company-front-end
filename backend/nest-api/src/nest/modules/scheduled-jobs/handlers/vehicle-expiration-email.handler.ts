import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';
import { SCHEDULED_JOB_IDS } from '../scheduled-job-ids';
import { ScheduledJobRecipientsService } from '../scheduled-job-recipients.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface VehicleRow extends RowDataPacket {
  id: number;
  department: string;
  vehicleMake: string;
  year: string;
  vin: string;
  exp: string;
  vehicleNumber: string;
  licensePlate: string;
}

interface VehicleExpirationTemplateRow {
  vin: string;
  department: string;
  vehicleMake: string;
  year: string;
  exp: string;
  vehicleNumber: string;
  licensePlate: string;
  dueLabel: string;
  editLink: string;
  isExpired: boolean;
}

// Days before expiration to trigger alerts — mirrors PHP logic exactly
const ALERT_DAYS = new Set([18, 14, 12, 10, 8, 6, 4]);
const HOT_DAYS = new Set([2, 0]);

@Injectable()
export class VehicleExpirationEmailHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(VehicleExpirationEmailHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly scheduledJobRecipientsService: ScheduledJobRecipientsService,
    private readonly urlBuilder: UrlBuilder,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      const vehicles = await this.mysqlService.query<VehicleRow[]>(`
        SELECT id, department, vehicleMake, year, vin, exp, vehicleNumber, licensePlate
        FROM eyefidb.vehicleInformation
        WHERE active = 1
      `);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sendEmail: Array<VehicleRow & { dateDiff: number }> = [];
      const sendEmailHot: Array<VehicleRow & { dateDiff: number }> = [];
      const sendEmailExpired: Array<VehicleRow & { dateDiff: number }> = [];

      for (const row of vehicles) {
        if (!row.exp) continue;
        const expDate = new Date(row.exp);
        expDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (ALERT_DAYS.has(diffDays)) {
          sendEmail.push({ ...row, dateDiff: diffDays });
        } else if (HOT_DAYS.has(diffDays)) {
          sendEmailHot.push({ ...row, dateDiff: diffDays });
        } else if (diffDays < 0) {
          sendEmailExpired.push({ ...row, dateDiff: diffDays });
        }
      }

      const totalToEmail = sendEmail.length + sendEmailHot.length + sendEmailExpired.length;
      this.logger.log(
        `[${trigger}] vehicle-expiration-email -> ${sendEmailHot.length} hot, ${sendEmail.length} upcoming, ${sendEmailExpired.length} expired`,
      );

      if (totalToEmail > 0) {
        const to = await this.scheduledJobRecipientsService.resolveSubscribedEmails(
          SCHEDULED_JOB_IDS.VEHICLE_EXPIRATION_EMAIL,
        );

        if (to.length > 0) {
          const hasExpired = sendEmailExpired.length > 0;
          const hasUrgent = sendEmailHot.length > 0 || hasExpired;
          const subject = hasExpired
            ? 'ATTENTION!! Vehicle registration has expired for one or more vehicles. Immediate action required'
            : hasUrgent
              ? 'ATTENTION!! Vehicle registration is about to expire. Please renew as soon as possible'
              : 'Vehicle registration expiration report';

          const listLink = this.urlBuilder.operations.vehicleList();
          const html = this.emailTemplateService.render('vehicle-expiration-email', {
            listLink,
            rows: this.buildTemplateRows([...sendEmailExpired, ...sendEmailHot, ...sendEmail]),
            hasExpired: sendEmailExpired.length > 0,
            hasHot: sendEmailHot.length > 0,
            total: totalToEmail,
            expiredCount: sendEmailExpired.length,
            hotCount: sendEmailHot.length,
            upcomingCount: sendEmail.length,
          });

          await this.emailService.sendMail({
            to,
            scheduledJobId: SCHEDULED_JOB_IDS.VEHICLE_EXPIRATION_EMAIL,
            subject,
            html,
          });
        } else {
          this.logger.warn('No recipients configured for vehicle-expiration-email');
        }
      }

      const durationMs = Date.now() - startedAtMs;
      return {
        id: 'vehicle-expiration-email',
        name: 'Vehicle Expiration Email',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${totalToEmail} vehicles processed (${sendEmailHot.length} hot, ${sendEmail.length} upcoming, ${sendEmailExpired.length} expired).`,
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
      this.logger.error(`[${trigger}] vehicle-expiration-email failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] vehicle-expiration-email ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

      return {
        id: 'vehicle-expiration-email',
        name: 'Vehicle Expiration Email',
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

  private buildTemplateRows(rows: Array<VehicleRow & { dateDiff: number }>): VehicleExpirationTemplateRow[] {
    return rows.map((row) => ({
      vin: row.vin,
      department: row.department,
      vehicleMake: row.vehicleMake,
      year: row.year,
      exp: row.exp,
      vehicleNumber: row.vehicleNumber,
      licensePlate: row.licensePlate,
      dueLabel: row.dateDiff < 0 ? `${Math.abs(row.dateDiff)} days overdue` : `${row.dateDiff} days`,
      editLink: this.urlBuilder.operations.vehicleEdit(row.id),
      isExpired: row.dateDiff < 0,
    }));
  }
}

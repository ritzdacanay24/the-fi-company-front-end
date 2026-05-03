import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { UrlBuilder } from '@/shared/url/url-builder';
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

// Days before expiration to trigger alerts — mirrors PHP logic exactly
const ALERT_DAYS = new Set([18, 14, 12, 10, 8, 6, 4]);
const HOT_DAYS = new Set([2, 0]);

@Injectable()
export class VehicleExpirationEmailHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(VehicleExpirationEmailHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly emailNotificationService: EmailNotificationService,
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

      for (const row of vehicles) {
        if (!row.exp) continue;
        const expDate = new Date(row.exp);
        expDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (ALERT_DAYS.has(diffDays)) {
          sendEmail.push({ ...row, dateDiff: diffDays });
        } else if (HOT_DAYS.has(diffDays)) {
          sendEmailHot.push({ ...row, dateDiff: diffDays });
        }
      }

      const totalToEmail = sendEmail.length + sendEmailHot.length;
      this.logger.log(
        `[${trigger}] vehicle-expiration-email -> ${sendEmailHot.length} hot, ${sendEmail.length} upcoming`,
      );

      if (totalToEmail > 0) {
        const recipientRows = await this.emailNotificationService.find({ location: 'vehicle_registration_email' });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        if (to.length > 0) {
          const isHot = sendEmailHot.length > 0;
          const subject = isHot
            ? 'ATTENTION!! Vehicle registration is about to expire. Please renew as soon as possible'
            : 'Vehicle registration expiration report';

          const listLink = 'https://dashboard.eye-fi.com/dist/web/operations/forms/vehicle/list';
          let body = `Hello Team, <br>`;
          body += `Listed below are vehicles that will expire soon. Once registration is completed, please click <a href="${listLink}" target="_parent">here</a> to update the expiration date.<br><br>`;
          body += `<table rules="all" style="border-color: #666;" cellpadding="10">`;
          body += `<tr style='background: #eee;'><td></td><td><strong>Vin</strong></td><td><strong>Department</strong></td><td><strong>Vehicle Make</strong></td><td><strong>Year</strong></td><td><strong>Expiration</strong></td><td><strong>Vehicle Number</strong></td><td><strong>License Plate #</strong></td><td><strong>Due In</strong></td></tr>`;

          for (const row of [...sendEmailHot, ...sendEmail]) {
            const editLink = this.urlBuilder.operations.vehicleEdit(row.id);
            body += `<tr><td><a href="${editLink}" target="_parent">View</a></td><td>${row.vin}</td><td>${row.department}</td><td>${row.vehicleMake}</td><td>${row.year}</td><td>${row.exp}</td><td>${row.vehicleNumber}</td><td>${row.licensePlate}</td><td>${row.dateDiff} days</td></tr>`;
          }

          body += `</table><br><hr>This is an automated email. Please do not respond.<br>Thank you.`;

          await this.emailService.sendMail({ to, subject, html: body });
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
        message: `${totalToEmail} vehicles with expiring registrations processed (${sendEmailHot.length} hot).`,
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
      this.logger.error(`[${trigger}] vehicle-expiration-email failed in ${durationMs}ms: ${message}`);

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
}

import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailNotificationService } from '@/nest/modules/email-notification/email-notification.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface InspectionRecord extends RowDataPacket {
  id: number;
  asset_name: string;
  asset_type: 'vehicle' | 'forklift';
  inspection_date: string;
  inspector_name: string;
  status: string;
  notes: string;
}

@Injectable()
export class InspectionEmailHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(InspectionEmailHandler.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly emailService: EmailService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      // Query vehicle inspections for today
      const vehicleInspections = await this.mysqlService.query<InspectionRecord[]>(`
        SELECT 
          vi.id,
          v.name as asset_name,
          'vehicle' as asset_type,
          DATE(vi.inspection_date) as inspection_date,
          u.name as inspector_name,
          vi.status,
          vi.notes
        FROM vehicle_inspection vi
        JOIN vehicle v ON v.id = vi.vehicle_id
        LEFT JOIN user u ON u.id = vi.inspector_id
        WHERE DATE(vi.inspection_date) = CURDATE()
        ORDER BY vi.inspection_date DESC
      `);

      // Query forklift inspections for today
      const forkLiftInspections = await this.mysqlService.query<InspectionRecord[]>(`
        SELECT 
          fi.id,
          f.name as asset_name,
          'forklift' as asset_type,
          DATE(fi.inspection_date) as inspection_date,
          u.name as inspector_name,
          fi.status,
          fi.notes
        FROM forklift_inspection fi
        JOIN forklift f ON f.id = fi.forklift_id
        LEFT JOIN user u ON u.id = fi.inspector_id
        WHERE DATE(fi.inspection_date) = CURDATE()
        ORDER BY fi.inspection_date DESC
      `);

      const totalInspections = vehicleInspections.length + forkLiftInspections.length;

      if (totalInspections > 0) {
        const recipientRows = await this.emailNotificationService.find({ location: 'forklift_and_vehicle_inspection_report' });
        const to = (recipientRows as Array<{ email?: string }>)
          .map((r) => r.email)
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0);

        let emailBody = `<h2>Daily Inspection Report for ${new Date().toLocaleDateString()}</h2>`;

        if (vehicleInspections.length > 0) {
          emailBody += '<h3>Vehicle Inspections:</h3>';
          emailBody += this.buildInspectionTable(vehicleInspections);
        }

        if (forkLiftInspections.length > 0) {
          emailBody += '<h3>Forklift Inspections:</h3>';
          emailBody += this.buildInspectionTable(forkLiftInspections);
        }

        emailBody += `<p style="font-size:12px;color:#999">
          This is an automated message. Total inspections today: ${totalInspections}
        </p>`;

        await this.emailService.sendMail({
          to,
          subject: `Daily Inspection Report - ${totalInspections} inspections`,
          html: emailBody,
        });
      }

      const durationMs = Date.now() - startedAtMs;
      this.logger.log(`[${trigger}] inspection-email -> ${totalInspections} inspections processed in ${durationMs}ms`);

      return {
        id: 'inspection-email',
        name: 'Inspection Email Report',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `${totalInspections} inspections processed and reported.`,
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
      this.logger.error(`[${trigger}] inspection-email failed in ${durationMs}ms: ${message}`);

      return {
        id: 'inspection-email',
        name: 'Inspection Email Report',
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

  private buildInspectionTable(inspections: InspectionRecord[]): string {
    let tableRows = '';
    for (const inspection of inspections) {
      const statusColor = inspection.status === 'pass' ? 'green' : inspection.status === 'fail' ? 'red' : 'orange';
      tableRows += `<tr>
        <td>${inspection.asset_name}</td>
        <td>${inspection.asset_type}</td>
        <td>${inspection.inspector_name || 'N/A'}</td>
        <td style="color:${statusColor};font-weight:bold">${inspection.status?.toUpperCase() || 'PENDING'}</td>
        <td>${inspection.notes || '-'}</td>
      </tr>`;
    }

    return `<table rules="all" style="border-color:#666" cellpadding="5" border="1">
      <tr style="background:#eee">
        <th>Asset Name</th>
        <th>Type</th>
        <th>Inspector</th>
        <th>Status</th>
        <th>Notes</th>
      </tr>
      ${tableRows}
    </table><br>`;
  }

}

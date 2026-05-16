import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { SCHEDULED_JOB_IDS } from '../scheduled-job-ids';
import { ScheduledJobRecipientsService } from '../scheduled-job-recipients.service';
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
    private readonly scheduledJobRecipientsService: ScheduledJobRecipientsService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      // Query vehicle inspections for today
      const vehicleInspections = await this.mysqlService.query<InspectionRecord[]>(`
        SELECT 
          COALESCE(vh.id, 0) as id,
          CONCAT(
            COALESCE(vi.vehicleNumber, 'Unknown Vehicle'),
            CASE
              WHEN COALESCE(vi.department, '') = '' THEN ''
              ELSE CONCAT(' / ', vi.department)
            END
          ) as asset_name,
          'vehicle' as asset_type,
          CURDATE() as inspection_date,
          COALESCE(vh.created_by, 'N/A') as inspector_name,
          CASE
            WHEN vh.id IS NULL THEN 'missing'
            WHEN COALESCE(stats.failed_count, 0) > 0 THEN 'fail'
            WHEN COALESCE(stats.total_count, 0) > 0 THEN 'pass'
            ELSE 'pending'
          END as status,
          CASE
            WHEN vh.id IS NULL THEN 'No Inspection found.'
            ELSE COALESCE(vh.comments, '-')
          END as notes
        FROM vehicleInformation vi
        LEFT JOIN (
          SELECT h1.*
          FROM forms.vehicle_inspection_header h1
          INNER JOIN (
            SELECT truck_license_plate, MAX(id) as max_id
            FROM forms.vehicle_inspection_header
            WHERE DATE(date_created) = CURDATE()
            GROUP BY truck_license_plate
          ) latest ON latest.max_id = h1.id
        ) vh ON vh.truck_license_plate = vi.licensePlate
        LEFT JOIN (
          SELECT
            forklift_checklist_id,
            COUNT(id) as total_count,
            SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as failed_count
          FROM forms.vehicle_inspection_details
          GROUP BY forklift_checklist_id
        ) stats ON stats.forklift_checklist_id = vh.id
        WHERE COALESCE(vi.active, 1) = 1
          AND COALESCE(vi.licensePlate, '') <> ''
        ORDER BY vi.vehicleNumber ASC
      `);

      // Query forklift inspections for today
      const forkLiftInspections = await this.mysqlService.query<InspectionRecord[]>(`
        SELECT 
          COALESCE(fc.id, 0) as id,
          fo.name as asset_name,
          'forklift' as asset_type,
          CURDATE() as inspection_date,
          COALESCE(fc.operator, 'N/A') as inspector_name,
          CASE
            WHEN fc.id IS NULL THEN 'missing'
            WHEN COALESCE(stats.failed_count, 0) > 0 THEN 'fail'
            WHEN COALESCE(stats.total_count, 0) > 0 THEN 'pass'
            ELSE 'pending'
          END as status,
          CASE
            WHEN fc.id IS NULL THEN 'No Inspection found.'
            ELSE COALESCE(fc.comments, '-')
          END as notes
        FROM forms.forklift_options fo
        LEFT JOIN (
          SELECT c1.*
          FROM forms.forklift_checklist c1
          INNER JOIN (
            SELECT model_number, MAX(id) as max_id
            FROM forms.forklift_checklist
            WHERE DATE(date_created) = CURDATE()
            GROUP BY model_number
          ) latest ON latest.max_id = c1.id
        ) fc ON fc.model_number = fo.name
        LEFT JOIN (
          SELECT
            forklift_checklist_id,
            COUNT(id) as total_count,
            SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as failed_count
          FROM forms.forklift_checklist_details
          GROUP BY forklift_checklist_id
        ) stats ON stats.forklift_checklist_id = fc.id
        WHERE COALESCE(fo.name, '') <> ''
        ORDER BY fo.name ASC
      `);

      const completedVehicleInspections = vehicleInspections.filter((row) => row.id > 0).length;
      const completedForkliftInspections = forkLiftInspections.filter((row) => row.id > 0).length;
      const totalInspections = completedVehicleInspections + completedForkliftInspections;
      const totalTrackedAssets = vehicleInspections.length + forkLiftInspections.length;

      if (totalTrackedAssets > 0) {
        const to = await this.scheduledJobRecipientsService.resolveSubscribedEmails(SCHEDULED_JOB_IDS.INSPECTION_EMAIL);

        if (!to.length) {
          this.logger.warn('No recipients configured for forklift_and_vehicle_inspection_report');
          return {
            id: 'inspection-email',
            name: 'Inspection Email Report',
            trigger,
            ok: true,
            statusCode: 200,
            durationMs: Date.now() - startedAtMs,
            message: `${totalInspections} submitted inspections found across ${totalTrackedAssets} tracked assets, but no recipients configured.`,
            lastRun: {
              startedAt: new Date(startedAtMs).toISOString(),
              finishedAt: new Date().toISOString(),
              durationMs: Date.now() - startedAtMs,
              status: 'success',
              triggerType: trigger,
              errorMessage: null,
            },
          };
        }

        const reportDate = new Date().toLocaleDateString();
        const vehicleRows = this.toTemplateRows(vehicleInspections);
        const forkliftRows = this.toTemplateRows(forkLiftInspections);
        const html = this.emailTemplateService.render('daily-inspection-summary-report', {
          reportDate,
          totalInspections,
          totalTrackedAssets,
          hasVehicleInspections: vehicleRows.length > 0,
          hasForkliftInspections: forkliftRows.length > 0,
          vehicleInspections: vehicleRows,
          forkliftInspections: forkliftRows,
        });

        await this.emailService.sendMail({
          to,
          scheduledJobId: SCHEDULED_JOB_IDS.INSPECTION_EMAIL,
          subject: `Daily Forklift and Vehicle Summary Report - ${totalInspections} inspections`,
          html,
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
        message: `${totalInspections} submitted inspections reported across ${totalTrackedAssets} tracked assets.`,
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
      this.logger.error(`[${trigger}] inspection-email failed in ${durationMs}ms: ${message}`);
      if (odbcErrors) {
        this.logger.error(`[${trigger}] inspection-email ODBC errors: ${JSON.stringify(odbcErrors, null, 2)}`);
      }

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

  private toTemplateRows(inspections: InspectionRecord[]): Array<{
    assetName: string;
    assetType: string;
    inspectorName: string;
    statusText: string;
    statusColor: string;
    notes: string;
  }> {
    return inspections.map((inspection) => {
      const normalizedStatus = String(inspection.status || '').toLowerCase();
      let statusColor = '#b45309';
      if (normalizedStatus === 'pass') {
        statusColor = '#15803d';
      } else if (normalizedStatus === 'fail') {
        statusColor = '#b91c1c';
      } else if (normalizedStatus === 'missing') {
        statusColor = '#b91c1c';
      }

      return {
        assetName: String(inspection.asset_name || '-'),
        assetType: String(inspection.asset_type || '-'),
        inspectorName: String(inspection.inspector_name || 'N/A'),
        statusText: String(inspection.status || 'pending').toUpperCase(),
        statusColor,
        notes: String(inspection.notes || '-'),
      };
    });
  }

}

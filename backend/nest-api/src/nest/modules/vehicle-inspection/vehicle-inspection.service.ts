import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VehicleInspectionRepository } from './vehicle-inspection.repository';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';

interface VehicleInspectionGroupedDetail {
  name: string;
  details: Array<{
    id: number;
    resolved_by_date: string | null;
    resolved_confirmed_date: string | null;
    name: string;
    status: number | string;
  }>;
}

interface FailedVehicleInspectionItem {
  group_name: string;
  checklist_name: string;
}

@Injectable()
export class VehicleInspectionService {
  private readonly logger = new Logger(VehicleInspectionService.name);

  constructor(
    private readonly repository: VehicleInspectionRepository,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
    private readonly urlBuilder: UrlBuilder,
  ) {}

  async getList() {
    return this.repository.getList();
  }

  async searchById(id: number) {
    const main = await this.repository.getHeaderById(id);
    if (!main) {
      throw new NotFoundException({
        code: 'RC_VEHICLE_INSPECTION_NOT_FOUND',
        message: `Vehicle inspection with id ${id} not found`,
      });
    }

    const detailRows = await this.repository.getDetailsByInspectionId(id);
    const attachments = await this.repository.getAttachmentsByInspectionId(id);

    return {
      main,
      details: this.groupDetails(detailRows),
      attachments,
    };
  }

  async getDetaliById(id: number) {
    const detail = await this.repository.getDetailById(id);
    if (!detail) {
      throw new NotFoundException({
        code: 'RC_VEHICLE_INSPECTION_DETAIL_NOT_FOUND',
        message: `Vehicle inspection detail with id ${id} not found`,
      });
    }

    return detail;
  }

  async saveDetailById(id: number, payload: Record<string, any>) {
    const detail = await this.repository.getDetailById(id);
    if (!detail) {
      throw new NotFoundException({
        code: 'RC_VEHICLE_INSPECTION_DETAIL_NOT_FOUND',
        message: `Vehicle inspection detail with id ${id} not found`,
      });
    }

    const rowCount = await this.repository.saveDetailById(id, payload);
    return { rowCount };
  }

  async create(payload: Record<string, any>) {
    const notUsed = this.parseNotUsed(payload.not_used);
    const insertId = await this.repository.createHeader({
      date_created: payload.date_created,
      truck_license_plate: payload.truck_license_plate,
      created_by: payload.created_by,
      comments: payload.comments || '',
      mileage: payload.mileage ?? null,
      not_used: notUsed,
    });

    let failedCount = 0;
  const failedItems: FailedVehicleInspectionItem[] = [];
    const detailGroups = Array.isArray(payload.details) ? payload.details : [];

    if (!notUsed) {
      for (const group of detailGroups) {
        const groupName = group?.name || '';
        const details = Array.isArray(group?.details) ? group.details : [];

        for (const item of details) {
          const status = item?.status ?? '';
          if (String(status) === '0') {
            failedCount++;
            failedItems.push({
              group_name: groupName,
              checklist_name: item?.name || '',
            });
          }

          await this.repository.insertDetail({
            group_name: groupName,
            checklist_name: item?.name || '',
            status,
            forklift_checklist_id: insertId,
          });
        }
      }
    }

    if (failedItems.length > 0) {
      await this.sendIssueNotification(insertId, failedItems, payload);
    }

    return {
      status: 1,
      message: `Successfully submitted. Your submitted id# is ${insertId}`,
      insertId,
      countMain: failedCount,
      details: payload.details,
      data: payload,
    };
  }

  private groupDetails(rows: Array<Record<string, any>>): VehicleInspectionGroupedDetail[] {
    const map = new Map<string, VehicleInspectionGroupedDetail>();

    for (const row of rows) {
      const groupName = row.group_name || '';
      if (!map.has(groupName)) {
        map.set(groupName, { name: groupName, details: [] });
      }

      map.get(groupName)?.details.push({
        id: row.id,
        resolved_by_date: row.resolved_by_date,
        resolved_confirmed_date: row.resolved_confirmed_date,
        name: row.checklist_name,
        status: row.status,
      });
    }

    return Array.from(map.values());
  }

  private parseNotUsed(value: unknown): number {
    if (value === true || value === 1 || value === '1' || value === 'true') {
      return 1;
    }
    return 0;
  }

  private async sendIssueNotification(
    inspectionId: number,
    failedItems: FailedVehicleInspectionItem[],
    headerData: Record<string, any>,
  ): Promise<void> {
    try {
      let recipients = await this.repository.getNotificationRecipients('create_vehicle_inspection');
      if (recipients.length === 0) {
        recipients = [this.configService.getOrThrow<string>('DEV_EMAIL_REROUTE_TO')];
        this.logger.warn(
          `[email] No active create_vehicle_inspection recipients; using fallback recipient ${recipients[0]}`,
        );
      }

      const link = this.urlBuilder.operations.vehicleInspectionEdit(inspectionId);
      const html = this.emailTemplateService.render('vehicle-inspection-failed', {
        inspectionId,
        link,
        createdBy: headerData.created_by || '',
        truckLicensePlate: headerData.truck_license_plate || '',
        mileage: headerData.mileage ?? null,
        comments: headerData.comments || '',
        failedItems,
      });

      await this.emailService.sendMail({
        to: recipients,
        subject: `Vehicle Inspection Submission Id# ${inspectionId}`,
        html,
      });

      this.logger.log(
        `[email] Vehicle inspection failure notification sent for inspection ${inspectionId} to ${recipients.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send vehicle inspection issue notification for id ${inspectionId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

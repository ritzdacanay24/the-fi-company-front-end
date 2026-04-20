import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ForkliftInspectionRepository } from './forklift-inspection.repository';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';

interface ForkliftChecklistDetailGroup {
  name: string;
  details: Array<{ name: string; status: number | string }>;
}

interface FailedForkliftChecklistItem {
  group_name: string;
  checklist_name: string;
}

@Injectable()
export class ForkliftInspectionService {
  private readonly logger = new Logger(ForkliftInspectionService.name);

  constructor(
    private readonly repository: ForkliftInspectionRepository,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  async getList() {
    return this.repository.getList();
  }

  async getById(id: number) {
    const main = await this.repository.getHeaderById(id);
    if (!main) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_INSPECTION_NOT_FOUND',
        message: `Forklift inspection with id ${id} not found`,
      });
    }

    const rows = await this.repository.getDetailsByChecklistId(id);
    const attachments = await this.repository.getAttachmentsByChecklistId(id);
    const grouped = this.groupDetails(rows);

    return {
      main,
      details: grouped,
      attachments,
    };
  }

  async create(payload: Record<string, any>) {
    const insertId = await this.repository.createHeader({
      date_created: payload.date_created,
      department: payload.department,
      operator: payload.operator,
      model_number: payload.model_number,
      shift: payload.shift,
      comments: payload.comments || '',
    });

    let failedCount = 0;
    const failedItems: FailedForkliftChecklistItem[] = [];
    const detailGroups = Array.isArray(payload.details) ? payload.details : [];

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

    this.logger.log(
      `[create] Forklift inspection ${insertId} processed with ${failedCount} failed item(s)`,
    );

    if (failedItems.length > 0) {
      await this.sendIssueNotification(insertId, failedItems, payload);
    } else {
      this.logger.log(`[create] Forklift inspection ${insertId} has no failures; email not sent`);
    }

    return {
      insertId,
      status: 1,
      countMain: failedCount,
      message: `Successfully submitted. Your submitted id# is ${insertId}`,
    };
  }

  async updateById(id: number, payload: Record<string, any>) {
    const header = await this.repository.getHeaderById(id);
    if (!header) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_INSPECTION_NOT_FOUND',
        message: `Forklift inspection with id ${id} not found`,
      });
    }

    await this.repository.updateHeaderById(id, payload);

    if (Array.isArray(payload.details)) {
      await this.repository.deleteDetailsByChecklistId(id);
      for (const group of payload.details) {
        const details = Array.isArray(group?.details) ? group.details : [];
        for (const item of details) {
          await this.repository.insertDetail({
            group_name: group?.name || '',
            checklist_name: item?.name || '',
            status: item?.status ?? '',
            forklift_checklist_id: id,
          });
        }
      }
    }

    return { rowCount: 1 };
  }

  async deleteById(id: number) {
    const header = await this.repository.getHeaderById(id);
    if (!header) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_INSPECTION_NOT_FOUND',
        message: `Forklift inspection with id ${id} not found`,
      });
    }

    await this.repository.deleteDetailsByChecklistId(id);
    await this.repository.deleteHeaderById(id);
    return { rowCount: 1 };
  }

  private groupDetails(rows: Array<Record<string, any>>): ForkliftChecklistDetailGroup[] {
    const map = new Map<string, ForkliftChecklistDetailGroup>();

    for (const row of rows) {
      const groupName = row.group_name || '';
      if (!map.has(groupName)) {
        map.set(groupName, { name: groupName, details: [] });
      }

      map.get(groupName)?.details.push({
        name: row.checklist_name,
        status: row.status,
      });
    }

    return Array.from(map.values());
  }

  private async sendIssueNotification(
    inspectionId: number,
    failedItems: FailedForkliftChecklistItem[],
    headerData: Record<string, any>,
  ): Promise<void> {
    try {
      let recipients = await this.repository.getNotificationRecipients('create_forklift_inspection');
      if (recipients.length === 0) {
        recipients = [this.configService.getOrThrow<string>('DEV_EMAIL_REROUTE_TO')];
        this.logger.warn(
          `[email] No active create_forklift_inspection recipients; using fallback recipient ${recipients[0]}`,
        );
      }

      const baseUrl = this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL');
      const link = UrlBuilder.operations.forkliftInspectionEdit(baseUrl, inspectionId);
      const html = this.emailTemplateService.render('forklift-inspection-failed', {
        inspectionId,
        link,
        operator: headerData.operator || '',
        department: headerData.department || '',
        modelNumber: headerData.model_number || '',
        shift: headerData.shift || '',
        comments: headerData.comments || '',
        failedItems,
      });

      await this.emailService.sendMail({
        to: recipients,
        subject: `Forklift Checklist Submission Id# ${inspectionId}`,
        html,
      });

      this.logger.log(
        `[email] Forklift failure notification sent for inspection ${inspectionId} to ${recipients.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send forklift inspection issue notification for id ${inspectionId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

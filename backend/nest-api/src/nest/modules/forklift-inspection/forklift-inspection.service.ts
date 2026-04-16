import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ForkliftInspectionRepository } from './forklift-inspection.repository';
import { EmailService } from '@/shared/email/email.service';

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
    const grouped = this.groupDetails(rows);

    return {
      main,
      details: grouped,
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

    if (failedItems.length > 0) {
      await this.sendIssueNotification(insertId, failedItems, payload);
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
      const recipients = await this.repository.getNotificationRecipients('create_forklift_inspection');
      if (recipients.length === 0) {
        this.logger.warn(`No active email recipients configured for create_forklift_inspection`);
        return;
      }

      await this.emailService.sendMail({
        from: process.env.MAIL_FROM || 'noreply@the-fi-company.com',
        to: recipients,
        subject: `Forklift Checklist Submission Id# ${inspectionId}`,
        html: this.buildIssueEmailHtml(inspectionId, failedItems, headerData),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send forklift inspection issue notification for id ${inspectionId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private buildIssueEmailHtml(
    inspectionId: number,
    failedItems: FailedForkliftChecklistItem[],
    headerData: Record<string, any>,
  ): string {
    const link = `https://dashboard.eye-fi.com/dist/web/operations/forms/forklift-inspection/edit?id=${inspectionId}`;
    const inspectionDetails: string[] = [];

    if (headerData.operator) {
      inspectionDetails.push(`<strong>Operator:</strong> ${this.escapeHtml(String(headerData.operator))}<br />`);
    }
    if (headerData.department) {
      inspectionDetails.push(`<strong>Department:</strong> ${this.escapeHtml(String(headerData.department))}<br />`);
    }
    if (headerData.model_number) {
      inspectionDetails.push(`<strong>Model Number:</strong> ${this.escapeHtml(String(headerData.model_number))}<br />`);
    }
    if (headerData.shift) {
      inspectionDetails.push(`<strong>Shift:</strong> ${this.escapeHtml(String(headerData.shift))}<br />`);
    }

    const failedItemsHtml = failedItems
      .map(
        (item) =>
          `<li><strong>${this.escapeHtml(item.group_name)}</strong>: ${this.escapeHtml(item.checklist_name)}</li>`,
      )
      .join('');

    const commentsHtml = headerData.comments
      ? `
        <h3>Comments:</h3>
        <p style="background-color: #f5f5f5; padding: 10px; border-left: 4px solid #ccc;">
          ${this.escapeHtml(String(headerData.comments))}
        </p>
      `
      : '';

    return `
      <html>
        <body>
          <p>Hello Team,</p>
          <p>A new forklift checklist has been submitted and requires your immediate attention.</p>
          ${inspectionDetails.length > 0 ? `<h3>Inspection Details:</h3><p>${inspectionDetails.join('')}</p>` : ''}
          ${commentsHtml}
          <h3>Items Requiring Attention:</h3>
          <ul>${failedItemsHtml}</ul>
          <p>You can review the complete submission by clicking <a href="${link}">this link</a>.</p>
          <hr style="margin:30px 0;" />
          <h3>Contact Information</h3>
          <p>
            <strong>William Masannat</strong><br />
            Platinum Forklift Service<br />
            Phone: <a href="tel:+17029717225">+1 (702) 971-7225</a><br />
            Email: <a href="mailto:william@pfslv.com">william@pfslv.com</a><br />
            5216 Sand Dollar Ave<br />
            Las Vegas, NV 89141
          </p>
        </body>
      </html>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

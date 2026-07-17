import { BadGatewayException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ForkliftInspectionRepository } from './forklift-inspection.repository';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';
import { EmailNotificationsService } from '../email-notifications';

interface ForkliftChecklistDetailGroup {
  name: string;
  details: Array<{
    id: number;
    name: string;
    status: number | string;
    resolved_by: number | null;
    resolved_date: string | null;
    resolved_message: string | null;
    resolved_confirmed_by: number | null;
    resolved_confirmed_date: string | null;
    resolved_confirmed_message: string | null;
  }>;
}

interface FailedForkliftChecklistItem {
  group_name: string;
  checklist_name: string;
}

@Injectable()
export class ForkliftInspectionService {
  private readonly logger = new Logger(ForkliftInspectionService.name);
  private readonly systemUserId = 0;
  private readonly legacySubmitUrl: string;

  constructor(
    private readonly repository: ForkliftInspectionRepository,
    private readonly emailService: EmailService,
    private readonly emailNotificationsService: EmailNotificationsService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
    private readonly urlBuilder: UrlBuilder,
  ) {
    this.legacySubmitUrl =
      this.configService.get<string>('FORKLIFT_INSPECTION_LEGACY_URL') ||
      'https://dashboard.eye-fi.com/server/ApiV2/forklift-inspection/index';
  }

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
    const notUsed = this.parseNotUsed(payload.not_used);
    const insertId = await this.repository.createHeader({
      date_created: payload.date_created,
      department: payload.department,
      operator: payload.operator,
      model_number: payload.model_number,
      shift: payload.shift,
      not_used: notUsed,
      comments: payload.comments || '',
    });

    let failedCount = 0;
    const failedItems: FailedForkliftChecklistItem[] = [];
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

  async createLegacy(payload: Record<string, any>) {
    const timeoutMs = 15000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.legacySubmitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const rawBody = await response.text();
      const parsedBody = this.tryParseJson(rawBody);

      if (!response.ok) {
        this.logger.error(
          `[createLegacy] Legacy submit failed with ${response.status} ${response.statusText}`,
        );

        throw new BadGatewayException({
          code: 'RC_FORKLIFT_LEGACY_SUBMIT_FAILED',
          message: 'Legacy forklift inspection submit failed',
          legacyStatus: response.status,
          legacyStatusText: response.statusText,
          legacyResponse: parsedBody,
        });
      }

      this.logger.log(
        `[createLegacy] Forwarded forklift inspection submit to legacy endpoint ${this.legacySubmitUrl}`,
      );

      return parsedBody;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.error(
        `[createLegacy] Failed to call legacy endpoint ${this.legacySubmitUrl}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new BadGatewayException({
        code: 'RC_FORKLIFT_LEGACY_UNAVAILABLE',
        message: 'Legacy forklift inspection endpoint is unavailable',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async updateById(id: number, payload: Record<string, any>) {
    const header = await this.repository.getHeaderById(id);
    if (!header) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_INSPECTION_NOT_FOUND',
        message: `Forklift inspection with id ${id} not found`,
      });
    }

    const normalizedPayload = { ...payload };
    const normalizedNotUsed =
      normalizedPayload.not_used !== undefined
        ? this.parseNotUsed(normalizedPayload.not_used)
        : this.parseNotUsed(header.not_used);

    if (normalizedPayload.not_used !== undefined) {
      normalizedPayload.not_used = normalizedNotUsed;
    }

    await this.repository.updateHeaderById(id, normalizedPayload);

    if (normalizedNotUsed) {
      await this.repository.deleteDetailsByChecklistId(id);
      return { rowCount: 1 };
    }

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

  async resolveIssueByDetailId(detailId: number, payload: Record<string, any>) {
    const detail = await this.repository.getDetailById(detailId);
    if (!detail) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_INSPECTION_DETAIL_NOT_FOUND',
        message: `Forklift inspection detail with id ${detailId} not found`,
      });
    }

    const resolvedBy = Number(payload?.resolved_by);
    const resolvedMessage = String(payload?.resolved_message || '').trim();
    const resolvedDate = this.normalizeDateTimeInput(payload?.resolved_date);
    const resolvedById = Number.isFinite(resolvedBy) ? resolvedBy : this.systemUserId;

    const rowCount = await this.repository.resolveDetailById(detailId, {
      resolvedBy: resolvedById,
      resolvedMessage: resolvedMessage || 'Marked resolved by system.',
      resolvedDate,
    });

    if (rowCount < 1) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_INSPECTION_DETAIL_NOT_FOUND',
        message: `Forklift inspection detail with id ${detailId} not found`,
      });
    }

    return {
      rowCount: 1,
      message: 'Issue marked as resolved.',
    };
  }

  async confirmIssueByDetailId(detailId: number, payload: Record<string, any>) {
    const detail = await this.repository.getDetailById(detailId);
    if (!detail) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_INSPECTION_DETAIL_NOT_FOUND',
        message: `Forklift inspection detail with id ${detailId} not found`,
      });
    }

    if (!this.hasValidDateTimeValue(detail.resolved_date)) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_INSPECTION_DETAIL_NOT_RESOLVED',
        message: `Forklift inspection detail with id ${detailId} is not resolved yet`,
      });
    }

    const confirmedBy = Number(payload?.resolved_confirmed_by);
    const confirmationMessage = String(payload?.resolved_confirmed_message || '').trim();
    const confirmedDate = this.normalizeDateTimeInput(payload?.resolved_confirmed_date);
    const confirmedById = Number.isFinite(confirmedBy) ? confirmedBy : this.systemUserId;

    const rowCount = await this.repository.confirmResolvedDetailById(detailId, {
      confirmedBy: confirmedById,
      confirmationMessage: confirmationMessage || 'Resolution confirmed by system.',
      confirmedDate,
    });

    if (rowCount < 1) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_INSPECTION_DETAIL_NOT_FOUND',
        message: `Forklift inspection detail with id ${detailId} not found`,
      });
    }

    return {
      rowCount: 1,
      message: 'Resolved issue confirmed.',
    };
  }

  private groupDetails(rows: Array<Record<string, any>>): ForkliftChecklistDetailGroup[] {
    const map = new Map<string, ForkliftChecklistDetailGroup>();

    for (const row of rows) {
      const groupName = row.group_name || '';
      if (!map.has(groupName)) {
        map.set(groupName, { name: groupName, details: [] });
      }

      map.get(groupName)?.details.push({
        id: Number(row.id),
        name: row.checklist_name,
        status: row.status,
        resolved_by: row.resolved_by ?? null,
        resolved_date: row.resolved_date ?? null,
        resolved_message: row.resolved_message ?? null,
        resolved_confirmed_by: row.resolved_confirmed_by ?? null,
        resolved_confirmed_date: row.resolved_confirmed_date ?? null,
        resolved_confirmed_message: row.resolved_confirmed_message ?? null,
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

  private tryParseJson(value: string): any {
    if (!value) {
      return {};
    }

    try {
      return JSON.parse(value);
    } catch {
      return { raw: value };
    }
  }

  private normalizeDateTimeInput(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    if (!raw || raw.startsWith('0000-00-00')) {
      return null;
    }

    // Accept HTML datetime-local format (YYYY-MM-DDTHH:mm) and normalize for MySQL DATETIME.
    const normalized = raw.replace('T', ' ');
    return normalized.length === 16 ? `${normalized}:00` : normalized;
  }

  private hasValidDateTimeValue(value: unknown): boolean {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return false;
    }

    if (raw.startsWith('0000-00-00')) {
      return false;
    }

    return !Number.isNaN(Date.parse(raw));
  }

  private async sendIssueNotification(
    inspectionId: number,
    failedItems: FailedForkliftChecklistItem[],
    headerData: Record<string, any>,
  ): Promise<void> {
    try {
      let recipients = await this.emailNotificationsService.getRecipients('create_forklift_inspection');
      if (recipients.length === 0) {
        recipients = [this.configService.getOrThrow<string>('DEV_EMAIL_REROUTE_TO')];
        this.logger.warn(
          `[email] No active create_forklift_inspection recipients; using fallback recipient ${recipients[0]}`,
        );
      }

      const link = this.urlBuilder.operations.forkliftInspectionEdit(inspectionId);
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

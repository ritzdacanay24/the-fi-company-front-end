import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { MaterialRequestRepository } from './material-request.repository';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';

type MaterialRequestPayload = {
  main?: Record<string, unknown>;
  details?: Array<Record<string, unknown>>;
  createdDate?: string;
  id?: number;
};

type MaterialValidationItem = {
  partNumber?: string;
  qty?: number;
  createdDate?: string;
  createdBy?: number;
  isDuplicate?: boolean;
  reasonCode?: string | null;
  [key: string]: unknown;
};

type MaterialValidationLookupRow = Record<string, unknown>;

@Injectable()
export class MaterialRequestService {
  private readonly logger = new Logger(MaterialRequestService.name);

  constructor(
    private readonly repository: MaterialRequestRepository,
    private readonly mysqlService: MysqlService,
    private readonly qadOdbcService: QadOdbcService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  async getList(query: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll?: string | boolean;
  }) {
    return this.repository.getList({
      selectedViewType: query.selectedViewType,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      isAll: String(query.isAll) === 'true',
    });
  }

  async find(filters: Record<string, unknown>) {
    return this.repository.find(filters);
  }

  async getAll() {
    return this.repository.getAll();
  }

  async getById(id: number) {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_MRF_NOT_FOUND',
        message: `Material request with id ${id} not found`,
      });
    }
    return row;
  }

  async getHeader(id: number) {
    return this.getById(id);
  }

  async create(payload: MaterialRequestPayload, userId?: number) {
    const main = payload.main || payload;
    const details = Array.isArray(payload.details) ? payload.details : [];
    const createdDate = payload.createdDate || new Date().toISOString().slice(0, 19).replace('T', ' ');

    const result = await this.mysqlService.withTransaction(async (connection) => {
      const headerPayload: Record<string, unknown> = {
        ...main,
        createdDate,
      };

      const insertId = await this.repository.createHeader(headerPayload);

      for (const row of details) {
        await connection.execute(
          `INSERT INTO mrf_det (
            mrf_id, partNumber, qty, createdDate, createdBy, reasonCode, qtyPicked,
            notes, availableQty, message, description, validationStatus
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            insertId,
            String(row.partNumber || ''),
            Number(row.qty || 0),
            createdDate,
            Number(row.createdBy || userId || 0),
            String(row.reasonCode || ''),
            Number(row.qtyPicked || 0),
            String(row.notes || ''),
            row.availableQty == null ? null : Number(row.availableQty),
            row.message == null ? null : String(row.message),
            row.description == null ? null : String(row.description),
            String(row.validationStatus || 'pending'),
          ],
        );
      }

      return { insertId };
    });

    await this.sendCreateNotification(result.insertId, main);
    return result;
  }

  async updateById(id: number, payload: MaterialRequestPayload) {
    await this.getById(id);

    const main = payload.main || payload;
    const details = Array.isArray(payload.details) ? payload.details : [];

    return this.mysqlService.withTransaction(async (connection) => {
      const rowCount = await this.repository.updateHeader(id, {
        ...main,
        modifiedDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      for (const row of details) {
        if (row.id) {
          await connection.execute(
            `UPDATE mrf_det SET
              partNumber = ?, qty = ?, qtyPicked = ?, reasonCode = ?,
              notes = ?, availableQty = ?, message = ?, description = ?, modifiedDate = NOW()
            WHERE id = ?`,
            [
              String(row.partNumber || ''),
              Number(row.qty || 0),
              Number(row.qtyPicked || 0),
              String(row.reasonCode || ''),
              String(row.notes || ''),
              row.availableQty == null ? null : Number(row.availableQty),
              row.message == null ? null : String(row.message),
              row.description == null ? null : String(row.description),
              Number(row.id),
            ],
          );
        } else {
          await connection.execute(
            `INSERT INTO mrf_det (
              mrf_id, partNumber, qty, createdDate, createdBy, reasonCode, qtyPicked,
              notes, availableQty, message, description, validationStatus
            ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)` ,
            [
              id,
              String(row.partNumber || ''),
              Number(row.qty || 0),
              Number(row.createdBy || 0),
              String(row.reasonCode || ''),
              Number(row.qtyPicked || 0),
              String(row.notes || ''),
              row.availableQty == null ? null : Number(row.availableQty),
              row.message == null ? null : String(row.message),
              row.description == null ? null : String(row.description),
              String(row.validationStatus || 'pending'),
            ],
          );
        }
      }

      return { rowCount };
    });
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }

  async getValidation() {
    return this.repository.getValidation();
  }

  async getPicking() {
    return this.repository.getPicking();
  }

  async searchItemByQadPartNumber(rawItems?: string) {
    const items = this.parseValidationItems(rawItems);
    if (items.length === 0) {
      return [];
    }

    const partNumbers = items
      .map((item) => String(item.partNumber || '').trim().toUpperCase())
      .filter(Boolean);

    if (partNumbers.length === 0) {
      return items.map((item) => this.withValidationDefaults(item));
    }

    const placeholders = partNumbers.map(() => '?').join(',');
    const sql = `
      SELECT
          SUM(CAST(in_qty_oh AS NUMERIC(36,2))) AS qtyOnHand,
          SUM(CAST(in_qty_all AS NUMERIC(36,2))) AS totalAvail,
          MAX(fullDesc) AS fullDesc,
          MAX(CAST(sct_cst_tot AS NUMERIC(36,2))) AS sct_cst_tot,
          UPPER(b.in_part) AS in_part
      FROM in_mstr b
      LEFT JOIN (
          SELECT
              MAX(pt_desc1 || ' ' || pt_desc2) AS fullDesc,
              pt_part
          FROM pt_mstr
          WHERE pt_domain = 'EYE'
          GROUP BY pt_part
      ) a ON b.in_part = a.pt_part
      LEFT JOIN (
          SELECT
              UPPER(sct_part) AS sct_part,
              MAX(sct_cst_tot) AS sct_cst_tot
          FROM sct_det
          WHERE sct_sim = 'Standard'
            AND sct_domain = 'EYE'
            AND sct_site = 'EYE01'
          GROUP BY UPPER(sct_part)
      ) sct ON sct.sct_part = b.in_part
      WHERE b.in_part IN (${placeholders})
        AND in_domain = 'EYE'
      GROUP BY UPPER(b.in_part)
      WITH (NOLOCK)
    `;

    const rows = await this.qadOdbcService.queryWithParams<MaterialValidationLookupRow[]>(
      sql,
      partNumbers,
    );

    const byPart = new Map<string, MaterialValidationLookupRow>();
    for (const row of rows) {
      const rowPart = this.getLookupString(row, 'in_part').toUpperCase();
      if (rowPart) {
        byPart.set(rowPart, row);
      }
    }

    return items.map((item) => {
      const normalizedPart = String(item.partNumber || '').trim().toUpperCase();
      const lookup = byPart.get(normalizedPart);

      if (!lookup) {
        return this.withValidationDefaults(item);
      }

      return {
        ...item,
        message: '',
        hasError: false,
        availableQty: this.getLookupNumber(lookup, 'qtyonhand'),
        description: this.getLookupString(lookup, 'fulldesc'),
        cost: this.getLookupNumber(lookup, 'sct_cst_tot'),
      };
    });
  }

  async sendBackToValidation(id: number) {
    const mrf = await this.getById(id);
    if (!mrf.active) {
      throw new BadRequestException({ code: 'RC_MRF_NOT_ACTIVE', message: 'Material request is not active' });
    }
    if (mrf.pickedCompletedDate) {
      throw new BadRequestException({
        code: 'RC_MRF_ALREADY_COMPLETED',
        message: 'Material request already completed and cannot be sent back to validation',
      });
    }

    const rowCount = await this.repository.sendBackToValidation(id);
    return { rowCount };
  }

  async onPrint(details: Array<Record<string, unknown>>) {
    const rows = Array.isArray(details) ? details : [];
    const mrfIds = [...new Set(rows.map((row) => Number(row.mrf_id || 0)).filter((id) => id > 0))];

    for (const mrfId of mrfIds) {
      const printInfo = await this.repository.getPrintValidationInfo(mrfId);
      if (!printInfo || Number(printInfo.active) !== 1) {
        throw new BadRequestException({
          code: 'RC_MRF_NOT_ACTIVE',
          message: `Material request ${mrfId} is not active and cannot be printed`,
        });
      }

      if (printInfo.pickedCompletedDate) {
        throw new BadRequestException({
          code: 'RC_MRF_ALREADY_COMPLETED',
          message: `Material request ${mrfId} is already completed and cannot be printed`,
        });
      }

      const existingPrintedBy = String(printInfo.printedBy || '').trim();
      const requestedBy = String(
        rows.find((row) => Number(row.mrf_id || 0) === mrfId)?.printedBy || '',
      ).trim();

      if (existingPrintedBy && (!requestedBy || existingPrintedBy !== requestedBy)) {
        throw new BadRequestException({
          code: 'RC_MRF_PRINT_LOCKED',
          message: `Material request ${mrfId} is already printed by ${existingPrintedBy}`,
        });
      }
    }

    const rowCount = await this.repository.applyPrint(details);
    return { rowCount };
  }

  async clearPrint(details: Array<Record<string, unknown>>) {
    const rowCount = await this.repository.clearPrint(details);
    return { rowCount };
  }

  async completePicking(payload: {
    id: number;
    data: Array<Record<string, unknown>>;
    pickedCompletedDate: string;
  }) {
    const id = Number(payload.id);
    const rowCount = await this.repository.completePicking(
      id,
      Array.isArray(payload.data) ? payload.data : [],
      payload.pickedCompletedDate,
    );

    if (rowCount > 0) {
      await this.sendPickingCompleteNotification(id);
    }

    return { rowCount };
  }

  async getAllWithStatus() {
    const data = await this.repository.getAllWithStatus();
    return {
      success: true,
      data,
      total: data.length,
      message: 'Material requests retrieved successfully',
    };
  }

  async updateStatus(id: number, status: string, updatedBy?: number) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_MRF_NOT_FOUND',
        message: `Material request with id ${id} not found`,
      });
    }

    const data = await this.repository.updateStatus(id, status, updatedBy);
    return {
      success: true,
      data,
      message: 'Status updated successfully',
    };
  }

  async deleteLineItem(id: number) {
    const rowCount = await this.repository.deleteLineItem(id);
    return { rowCount };
  }

  private async sendCreateNotification(insertId: number, main: Record<string, unknown>): Promise<void> {
    try {
      const to = this.parseRecipientList(this.configService.get<string>('MATERIAL_REQUEST_NOTIFY_TO'));
      const cc = this.parseRecipientList(this.configService.get<string>('MATERIAL_REQUEST_NOTIFY_CC'));
      const fallbackTo = this.configService.getOrThrow<string>('DEV_EMAIL_REROUTE_TO');

      const recipients = to.length > 0 ? to : [fallbackTo];
      if (to.length === 0) {
        this.logger.warn(
          `[email] No MATERIAL_REQUEST_NOTIFY_TO configured; using fallback recipient ${fallbackTo}`,
        );
      }

      const baseUrl = this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL');
      const link = UrlBuilder.operations.materialRequestValidation(baseUrl, insertId);

      const html = this.emailTemplateService.render('material-request-created', {
        id: insertId,
        link,
        requestor: String(main.requestor || ''),
        lineNumber: String(main.lineNumber || ''),
        dueDate: String(main.dueDate || ''),
        priority: String(main.priority || ''),
      });

      await this.emailService.sendMail({
        to: recipients,
        cc: cc.length > 0 ? cc : undefined,
        subject: `Material Request Form #${insertId}`,
        html,
      });
    } catch (error) {
      this.logger.warn(
        `Material request create email failed for id ${insertId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private parseRecipientList(value: string | undefined): string[] {
    return String(value || '')
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }

  private async sendPickingCompleteNotification(id: number): Promise<void> {
    try {
      const info = await this.repository.getRequesterNotificationInfo(id);
      if (!info) {
        this.logger.warn(`[email] Unable to find material request #${id} for picked-complete notification`);
        return;
      }

      const recipient = String(info.requester_email || '').trim();
      if (!recipient) {
        this.logger.warn(`[email] Material request #${id} requestor email is missing; skipping notification`);
        return;
      }

      const baseUrl = this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL');
      const link = UrlBuilder.operations.materialRequestView(baseUrl, id);
      const status = info.pickedCompletedDate ? 'Picking Complete' : String(info.queue_status || 'Updated');

      const html = this.emailTemplateService.render('material-request-picked-complete', {
        id,
        status,
        link,
        requestor: String(info.requestor || info.requester_name || ''),
      });

      await this.emailService.sendMail({
        to: [recipient],
        subject: `Material Request #${id} - ${status}`,
        html,
      });
    } catch (error) {
      this.logger.warn(
        `Material request picked-complete email failed for id ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private parseValidationItems(rawItems?: string): MaterialValidationItem[] {
    if (!rawItems) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawItems) as unknown;
      return Array.isArray(parsed) ? (parsed as MaterialValidationItem[]) : [];
    } catch {
      throw new BadRequestException({
        code: 'RC_MRF_INVALID_SEARCH_PAYLOAD',
        message: 'Invalid searchItemByQadPartNumber payload',
      });
    }
  }

  private withValidationDefaults(item: MaterialValidationItem): MaterialValidationItem {
    return {
      ...item,
      message: '---ITEM NOT FOUND---',
      hasError: true,
      availableQty: 0,
      description: '',
      cost: 0,
    };
  }

  private getLookupValue(row: MaterialValidationLookupRow, key: string): unknown {
    return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()] ?? null;
  }

  private getLookupString(row: MaterialValidationLookupRow, key: string): string {
    const value = this.getLookupValue(row, key);
    return value == null ? '' : String(value);
  }

  private getLookupNumber(row: MaterialValidationLookupRow, key: string): number {
    const value = Number(this.getLookupValue(row, key));
    return Number.isFinite(value) ? value : 0;
  }
}

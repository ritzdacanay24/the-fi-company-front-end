import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { MaterialRequestRepository } from './material-request.repository';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { UrlBuilder } from '@/shared/url/url-builder';
import { EmailNotificationsService } from '../email-notifications';
import { UnifiedWebSocketService } from '@/shared/services/unified-websocket.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';

const MR_ALERT_CHANNEL = 'material-request-picking';
const MR_ALERT_SNAPSHOT_TYPE = 'MR_ALERT_SNAPSHOT';

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
    private readonly urlBuilder: UrlBuilder,
    private readonly emailNotificationsService: EmailNotificationsService,
    private readonly websocketService: UnifiedWebSocketService,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {
    this.websocketService.registerMrAlertRequestHandler((clientId, userId) =>
      this.handleMrAlertRequest(clientId, userId),
    );
  }

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
    await this.emitMrAlertSnapshot('created');
    return result;
  }

  async updateById(id: number, payload: MaterialRequestPayload) {
    await this.getById(id);

    const main = payload.main || payload;
    const details = Array.isArray(payload.details) ? payload.details : [];

    const result = await this.mysqlService.withTransaction(async (connection) => {
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

    if ((result?.rowCount || 0) > 0) {
      await this.emitMrAlertSnapshot('updated');
    }

    return result;
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    if (rowCount > 0) {
      await this.emitMrAlertSnapshot('deleted');
    }
    return { rowCount };
  }

  async getValidation() {
    return this.repository.getValidation();
  }

  async getPicking() {
    const picks = await this.repository.getPicking();
    if (!picks.length) return picks;

    // Collect all unique part numbers across all details
    const partNumbers = [
      ...new Set(
        picks.flatMap((row: any) =>
          (row.details || []).map((d: any) => String(d.partNumber || d.partNumberUpper || '').trim().toUpperCase()).filter(Boolean),
        ),
      ),
    ];

    if (partNumbers.length === 0) return picks;

    const placeholders = partNumbers.map(() => '?').join(', ');
    const locationRows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
      `SELECT CAST(a.ld_loc AS CHAR(25)) LD_LOC
        , a.ld_part LD_PART
        , a.ld_qty_oh LD_QTY_OH
        , a.ld_qty_all LD_QTY_ALL
        , a.ld_qty_oh - a.ld_qty_all availableQty
        , a.ld_lot
        , a.ld_ref
       FROM ld_det a
       WHERE a.ld_part IN (${placeholders})
         AND a.ld_domain = 'EYE'
         AND a.ld_qty_oh > 0
         AND a.ld_loc NOT IN ('JIAXING', 'PCREJ', 'REJECT', 'PROTO')
       ORDER BY CASE WHEN a.ld_loc = 'INTGRTD' THEN 0 END ASC
       WITH (NOLOCK)`,
      partNumbers,
      { keyCase: 'upper' },
    );

    // Group locations by part number for fast lookup
    const locationsByPart = new Map<string, Array<Record<string, unknown>>>();
    for (const loc of locationRows) {
      const part = String(loc.LD_PART || '').trim().toUpperCase();
      if (!locationsByPart.has(part)) locationsByPart.set(part, []);
      locationsByPart.get(part)!.push(loc);
    }

    // Attach locations to each detail row
    for (const row of picks as any[]) {
      for (const detail of row.details || []) {
        const part = String(detail.partNumber || detail.partNumberUpper || '').trim().toUpperCase();
        detail.locations = locationsByPart.get(part) || [];
      }
    }

    return picks;
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

    let rows: MaterialValidationLookupRow[] = [];
    try {
      rows = await this.qadOdbcService.queryWithParams<MaterialValidationLookupRow[]>(
        sql,
        partNumbers,
      );
    } catch (error) {
      this.logger.warn(
        `QAD validation unavailable in searchItemByQadPartNumber; bypassing validation for ${partNumbers.length} item(s): ${error instanceof Error ? error.message : String(error)}`,
      );
      return items.map((item) => this.withValidationBypass(item));
    }

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

  async getValidationConnectionStatus() {
    try {
      await this.qadOdbcService.query('SELECT 1 AS ok');
      return {
        isConnected: true,
        message: 'QAD is online.',
      };
    } catch (error) {
      this.logger.warn(
        `QAD connection check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        isConnected: false,
        message: 'QAD is currently unreachable. QAD-dependent features will be bypassed until connectivity is restored.',
      };
    }
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
    if (rowCount > 0) {
      await this.emitMrAlertSnapshot('sent-back-to-validation');
    }
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
      await this.emitMrAlertSnapshot('picking-complete');
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
    await this.emitMrAlertSnapshot('status-updated');
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
      const to = await this.emailNotificationsService.getRecipients('create_material_request');
      const fallbackTo = this.configService.getOrThrow<string>('DEV_EMAIL_REROUTE_TO');

      const recipients = to.length > 0 ? to : [fallbackTo];
      if (to.length === 0) {
        this.logger.warn(
          `[email] No create_material_request recipients configured; using fallback recipient ${fallbackTo}`,
        );
      }

      const link = this.urlBuilder.operations.materialRequestValidation(insertId);

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
        subject: `Material Request Form #${insertId}`,
        html,
      });
    } catch (error) {
      this.logger.warn(
        `Material request create email failed for id ${insertId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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

      const link = this.urlBuilder.operations.materialRequestView(id);
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

  private withValidationBypass(item: MaterialValidationItem): MaterialValidationItem {
    return {
      ...item,
      message: '',
      hasError: false,
      validationBypassed: true,
      availableQty: null,
      description: '',
      cost: null,
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

  private async emitMrAlertSnapshot(reason: string): Promise<void> {
    try {
      const snapshot = await this.buildMrAlertSnapshot();
      this.websocketService.publishToChannel(
        MR_ALERT_CHANNEL,
        MR_ALERT_SNAPSHOT_TYPE,
        snapshot,
        'material-request-alert-snapshot',
      );

      if (reason === 'created' || reason === 'sent-back-to-validation' || reason === 'status-updated') {
        await this.pushNotificationsService.sendMaterialRequestAlert(reason, {
          pendingPickingCount: Number((snapshot as Record<string, unknown>).pendingPickingCount ?? 0),
          pendingValidationCount: Number((snapshot as Record<string, unknown>).pendingValidationCount ?? 0),
        });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to emit MR alert snapshot (${reason}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleMrAlertRequest(clientId: string, userId: number): Promise<void> {
    try {
      const snapshot = await this.buildMrAlertSnapshot();
      this.websocketService.sendToClientInChannel(
        clientId,
        MR_ALERT_CHANNEL,
        MR_ALERT_SNAPSHOT_TYPE,
        snapshot,
        'material-request-alert-snapshot-response',
      );
    } catch (error) {
      this.logger.error(`Failed to handle MR alert request for client ${clientId}:`, error as Error);
    }
  }

  private async buildMrAlertSnapshot(): Promise<unknown> {
    const [pickingRows, validationRows] = await Promise.all([
      this.repository.getPicking(),
      this.repository.getValidation(),
    ]);

    const picking = Array.isArray(pickingRows) ? pickingRows : [];
    const validation = Array.isArray(validationRows) ? validationRows : [];

    const recentItems = [
      ...picking.slice(0, 3).map((row) => ({ ...row, queue: 'picking', validated: true })),
      ...validation.slice(0, 3).map((row) => ({ ...row, queue: 'validation', validated: false })),
    ]
      .sort((a, b) => Number((b as Record<string, unknown>)['id'] ?? 0) - Number((a as Record<string, unknown>)['id'] ?? 0))
      .slice(0, 6);

    return {
      pendingPickingCount: picking.length,
      pendingValidationCount: validation.length,
      recentItems,
      reason: 'on-request',
    };
  }
}

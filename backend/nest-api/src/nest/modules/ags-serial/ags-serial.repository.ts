import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { BulkCreateAgsSerialDto, BulkCreateAgsSerialItemDto } from './dto/bulk-create-ags-serial.dto';
import { CreateAgsSerialDto } from './dto/create-ags-serial.dto';
import { UpdateAgsSerialDto } from './dto/update-ags-serial.dto';

export interface AgsSerialRecord extends RowDataPacket {
  id: number;
  timeStamp?: string;
  poNumber?: string;
  property_site?: string;
  sgPartNumber?: string;
  inspectorName?: string;
  generated_SG_asset?: string;
  serialNumber?: string;
  lastUpdate?: string;
  active?: number;
  manualUpdate?: string | null;
  created_by?: number | null;
}

const TABLE = 'agsSerialGenerator';
const AGS_CUSTOMER_TYPE_ID = 3;
const SERIAL_ASSIGNMENT_AUDIT_TABLE = 'serial_assignment_audit';

@Injectable()
export class AgsSerialRepository extends BaseRepository<AgsSerialRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super(TABLE, mysqlService);
  }

  private readonly allowedColumns = new Set([
    'timeStamp',
    'poNumber',
    'property_site',
    'sgPartNumber',
    'inspectorName',
    'generated_SG_asset',
    'serialNumber',
    'lastUpdate',
    'active',
    'manualUpdate',
    'created_by',
  ]);

  private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  private async resolveAvailableUlLabel(
    conn: {
      execute: <T = unknown>(sql: string, params?: Record<string, unknown>) => Promise<[T, unknown]>;
    },
    assignment: BulkCreateAgsSerialItemDto,
  ): Promise<{ id: number; ul_number: string } | null> {
    const ulLabelId = assignment.ul_label_id;
    const ulNumber = String(assignment.ulNumber ?? '').trim() || null;
    const ulCategoryRaw = String(assignment.ul_category ?? '').trim();
    const ulCategory = ulCategoryRaw ? ulCategoryRaw.toLowerCase() : null;

    if (!ulLabelId && !ulNumber) {
      return null;
    }

    const [ulRows] = await conn.execute<Array<RowDataPacket & { id: number; ul_number: string }>>(
      `
        SELECT ul.id, ul.ul_number
        FROM ul_labels ul
        LEFT JOIN serial_assignments sa
          ON sa.ul_label_id = ul.id
         AND COALESCE(sa.is_voided, 0) = 0
        WHERE ul.status = 'active'
          AND COALESCE(ul.is_consumed, 0) = 0
          AND sa.id IS NULL
          AND (:ul_category IS NULL OR LOWER(COALESCE(ul.category, '')) = :ul_category)
          AND (
            (:ul_label_id IS NOT NULL AND ul.id = :ul_label_id)
            OR (:ul_label_id IS NULL AND :ul_number IS NOT NULL AND ul.ul_number = :ul_number)
          )
        LIMIT 1
        FOR UPDATE
      `,
      {
        ul_label_id: ulLabelId ?? null,
        ul_number: ulNumber,
        ul_category: ulCategory,
      },
    );

    const matched = ulRows[0];
    if (!matched) {
      throw new Error('Selected UL label is not available for assignment');
    }

    return {
      id: Number(matched.id),
      ul_number: String(matched.ul_number),
    };
  }

  private async createSerialAssignment(
    conn: {
      execute: <T = unknown>(sql: string, params?: Record<string, unknown>) => Promise<[T, unknown]>;
    },
    params: {
      eyefiSerialId: number;
      eyefiSerialNumber: string;
      customerAssetId: number;
      generatedAssetNumber: string;
      assignment: BulkCreateAgsSerialItemDto;
      batchId: string;
      userFullName: string;
      ulLabel: { id: number; ul_number: string } | null;
    },
  ): Promise<number> {
    const [existingRows] = await conn.execute<Array<RowDataPacket & { id: number }>>(
      `
        SELECT id
        FROM serial_assignments
        WHERE eyefi_serial_id = :eyefi_serial_id
          AND COALESCE(is_voided, 0) = 0
        LIMIT 1
        FOR UPDATE
      `,
      { eyefi_serial_id: params.eyefiSerialId },
    );

    if (existingRows.length > 0) {
      throw new Error(`EyeFi serial '${params.eyefiSerialNumber}' is already assigned`);
    }

    const partNumber = String(params.assignment.partNumber ?? '').trim() || null;
    const woNumber = String(params.assignment.wo_number || '').trim() || null;
    const woPart = String(params.assignment.wo_part || '').trim() || null;
    const woDescription = String(params.assignment.wo_description || '').trim() || null;
    const woRouting = String(params.assignment.wo_routing || '').trim() || null;
    const woLine = String(params.assignment.wo_line || '').trim() || null;
    const cpCustPart = String(params.assignment.cp_cust_part || '').trim() || null;
    const cpCust = String(params.assignment.cp_cust ?? '').trim() || null;
    const inspectorName = String(params.assignment.inspector_name ?? '').trim();
    const consumedBy = String(params.assignment.consumed_by ?? '').trim();
    if (!inspectorName) {
      throw new Error('inspector_name is required');
    }
    if (!consumedBy) {
      throw new Error('consumed_by is required');
    }
    const notes = null;
    const poNumber = String(params.assignment.poNumber ?? '').trim() || null;
    const woQtyOrdRaw = params.assignment.wo_qty_ord;
    const woQtyOrd = woQtyOrdRaw == null ? null : Number(woQtyOrdRaw);
    const woDueDate = String(params.assignment.wo_due_date || '').trim() || null;

    const [insertResult] = await conn.execute<ResultSetHeader>(
      `
        INSERT INTO serial_assignments (
          eyefi_serial_id,
          eyefi_serial_number,
          ul_label_id,
          ul_number,
          customer_type_id,
          customer_asset_id,
          generated_asset_number,
          po_number,
          part_number,
          wo_number,
          wo_part,
          wo_description,
          wo_qty_ord,
          wo_due_date,
          wo_routing,
          wo_line,
          cp_cust_part,
          cp_cust,
          inspector_name,
          batch_id,
          status,
          consumed_at,
          consumed_by,
          is_voided,
          verification_status,
          notes,
          asset_type
        ) VALUES (
          :eyefi_serial_id,
          :eyefi_serial_number,
          :ul_label_id,
          :ul_number,
          :customer_type_id,
          :customer_asset_id,
          :generated_asset_number,
          :po_number,
          :part_number,
          :wo_number,
          :wo_part,
          :wo_description,
          :wo_qty_ord,
          :wo_due_date,
          :wo_routing,
          :wo_line,
          :cp_cust_part,
          :cp_cust,
          :inspector_name,
          :batch_id,
          'consumed',
          NOW(),
          :consumed_by,
          0,
          'pending',
          :notes,
          'serial'
        )
      `,
      {
        eyefi_serial_id: params.eyefiSerialId,
        eyefi_serial_number: params.eyefiSerialNumber,
        ul_label_id: params.ulLabel?.id ?? null,
        ul_number: params.ulLabel?.ul_number ?? null,
        customer_type_id: AGS_CUSTOMER_TYPE_ID,
        customer_asset_id: params.customerAssetId,
        generated_asset_number: params.generatedAssetNumber,
        po_number: poNumber,
        part_number: partNumber,
        wo_number: woNumber,
        wo_part: woPart,
        wo_description: woDescription,
        wo_qty_ord: Number.isFinite(woQtyOrd) ? woQtyOrd : null,
        wo_due_date: woDueDate,
        wo_routing: woRouting,
        wo_line: woLine,
        cp_cust_part: cpCustPart,
        cp_cust: cpCust,
        inspector_name: inspectorName,
        batch_id: params.batchId,
        consumed_by: consumedBy,
        notes,
      },
    );

    return Number(insertResult.insertId);
  }

  // ── Serial generation ──────────────────────────────────────────────────────
  // Format: EF + mmddyy + SSSS  (PHP: date("mdy") = month+day+2-digit-year)
  // Sequence resets to 1000 each new ISO week; otherwise increments by 1.

  private getWeekNumber(dateInput: string): string {
    const date = new Date(dateInput);
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return String(weekNo).padStart(2, '0');
  }

  /**
   * Simple: EF + MMDDYY + 4-digit sequence (1000-9999)
   * If week changed, reset to 1000. Otherwise increment.
   */
  private generateNextAgsSerialNumber(
    currentSequence: number,
    lastWeekNumber: string,
  ): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const dateSequence = `${mm}${dd}${yy}`;

    const currentWeekNumber = this.getWeekNumber(now.toISOString());
    const sequence =
      currentWeekNumber === String(lastWeekNumber).padStart(2, '0')
        ? currentSequence + 1
        : 1000;

    const sequenceStr = String(sequence).padStart(4, '0');
    return `EF${dateSequence}${sequenceStr}`;
  }

  private generateSerialNumber(
    previousSequence: number,
    lastRecordedWeekNumber: string,
  ): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const dateSequence = `${mm}${dd}${yy}`;

    const currentWeekNumber = this.getWeekNumber(now.toISOString());
    let sequence = 1000;
    if (currentWeekNumber === String(lastRecordedWeekNumber).padStart(2, '0')) {
      sequence = (previousSequence || 999) + 1;
    }

    const sequenceStr = String(sequence).padStart(4, '0');
    return `EF${dateSequence}${sequenceStr}`;
  }

  private async getLastGeneratedState(): Promise<{
    generatedAssetNumber: number;
    dateCreated: string;
  }> {
    const rows = await this.rawQuery<RowDataPacket & { generatedAssetNumber: string; dateCreated: string }>(
      `
        SELECT RIGHT(generated_SG_asset, 4) AS generatedAssetNumber,
               DATE(timeStamp) AS dateCreated
        FROM \`${TABLE}\`
        WHERE manualUpdate IS NULL OR manualUpdate = ''
        ORDER BY id DESC
        LIMIT 1
      `,
    );

    const first = rows[0] as { generatedAssetNumber?: string; dateCreated?: string } | undefined;
    return {
      generatedAssetNumber: Number(first?.generatedAssetNumber || 999),
      dateCreated: String(first?.dateCreated || new Date().toISOString().slice(0, 10)),
    };
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async getList(params: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll?: boolean;
  }): Promise<AgsSerialRecord[]> {
    const { selectedViewType, dateFrom, dateTo, isAll } = params;

    let sql = `SELECT * FROM \`${TABLE}\` a WHERE 1=1`;
    const sqlParams: string[] = [];

    const isDateOnly = (value?: string): boolean =>
      typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

    if (isAll) {
      sql += ' AND a.id != 0';
    } else if (isDateOnly(dateFrom) && isDateOnly(dateTo)) {
      sql += ' AND DATE(a.timeStamp) BETWEEN ? AND ?';
      sqlParams.push(String(dateFrom), String(dateTo));
    }

    if (selectedViewType === 'Active') {
      sql += ' AND a.active = 1';
    } else if (selectedViewType === 'Inactive') {
      sql += ' AND a.active = 0';
    }

    sql += ' ORDER BY a.timeStamp DESC';

    return this.rawQuery<AgsSerialRecord>(sql, sqlParams);
  }

  async getById(id: number): Promise<AgsSerialRecord | null> {
    const rows = await this.rawQuery<AgsSerialRecord>(
      `SELECT * FROM \`${TABLE}\` WHERE id = ? ORDER BY id DESC LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  async getAll(): Promise<AgsSerialRecord[]> {
    return this.rawQuery<AgsSerialRecord>(`SELECT * FROM \`${TABLE}\` ORDER BY timeStamp DESC`);
  }

  async checkIfSerialIsFound(assetNumber: string): Promise<Pick<AgsSerialRecord, 'generated_SG_asset'> | null> {
    const rows = await this.rawQuery<RowDataPacket & { generated_SG_asset: string }>(
      `
        SELECT generated_SG_asset
        FROM \`${TABLE}\`
        WHERE generated_SG_asset = ?
        LIMIT 1
      `,
      [assetNumber],
    );
    return (rows[0] as Pick<AgsSerialRecord, 'generated_SG_asset'>) || null;
  }

  async createAgsSerial(payload: CreateAgsSerialDto, userFullName?: string): Promise<{ insertId: number }> {
    const nowDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const basePayload: Record<string, unknown> = {
      ...payload,
      inspectorName: payload.inspectorName || userFullName || 'System',
      timeStamp: payload.timeStamp || nowDate,
      lastUpdate: payload.lastUpdate || nowDate,
    };

    if (!basePayload.generated_SG_asset) {
      const last = await this.getLastGeneratedState();
      basePayload.generated_SG_asset = this.generateSerialNumber(
        last.generatedAssetNumber,
        this.getWeekNumber(last.dateCreated),
      );
    } else {
      basePayload.manualUpdate = true;
    }

    const sanitized = this.sanitizePayload(basePayload);
    const keys = Object.keys(sanitized);
    const values = Object.values(sanitized);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO \`${TABLE}\` (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, values);
    return { insertId: result.insertId };
  }

  async updateById(id: number, payload: UpdateAgsSerialDto): Promise<number> {
    const nowDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const sanitized = this.sanitizePayload({
      ...payload,
      lastUpdate: nowDate,
    } as Record<string, unknown>);

    if (Object.keys(sanitized).length === 0) {
      return 0;
    }

    const keys = Object.keys(sanitized);
    const values = Object.values(sanitized);
    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const sql = `UPDATE \`${TABLE}\` SET ${setClause} WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [...values, id]);
    return result.affectedRows;
  }

  async softDeleteById(id: number): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `UPDATE \`${TABLE}\` SET active = 0 WHERE id = ?`,
      [id],
    );
    return result.affectedRows;
  }

  private async findOrCreateEyeFiSerial(connection: unknown, serialNumber: string): Promise<number | undefined> {
    if (!serialNumber) return undefined;

    const conn = connection as {
      execute: <T = unknown>(sql: string, params?: Record<string, unknown>) => Promise<[T, unknown]>;
    };

    const [existingRows] = await conn.execute<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM eyefi_serial_numbers WHERE serial_number = :serial_number LIMIT 1`,
      { serial_number: serialNumber },
    );

    if (existingRows[0]?.id) {
      return Number(existingRows[0].id);
    }

    const [insertResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO eyefi_serial_numbers (serial_number, status, is_consumed, created_at)
       VALUES (:serial_number, 'available', FALSE, NOW())`,
      { serial_number: serialNumber },
    );

    return Number(insertResult.insertId);
  }

  async bulkCreate(payload: BulkCreateAgsSerialDto): Promise<{
    success: boolean;
    message: string;
    count: number;
    data: Array<{ generated_asset_number: string; customer_asset_id: number; serialNumber?: string }>;
  }> {
    const assignments = payload.assignments || [];
    const userFullName = payload.user_full_name || 'System';
    const nowDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const result = await this.mysqlService.withTransaction(async (connection) => {
      const rows: Array<{ generated_asset_number: string; customer_asset_id: number; serialNumber?: string }> = [];
      const conn = connection as {
        execute: <T = unknown>(sql: string, params?: Record<string, unknown>) => Promise<[T, unknown]>;
      };

      // Query last record ONCE at the start
      const [lastRows] = await conn.execute<Array<RowDataPacket & { generatedAssetNumber: string; dateCreated: string }>>(
        `
          SELECT RIGHT(generated_SG_asset, 4) AS generatedAssetNumber,
                 DATE(timeStamp) AS dateCreated
          FROM \`${TABLE}\`
          WHERE manualUpdate IS NULL OR manualUpdate = ''
          ORDER BY id DESC
          LIMIT 1
        `,
      );

      const lastRecord = lastRows[0];
      const lastSequence = Number(lastRecord?.generatedAssetNumber || 999);
      let sequenceWeekNumber = this.getWeekNumber(String(lastRecord?.dateCreated || nowDate));

      // Track current sequence in memory as we loop
      let currentSequence = lastSequence;

      for (const assignment of assignments) {
        const serialNumber = String(assignment.serialNumber || '');
        let eyefiSerialId = assignment.eyefi_serial_id;

        if (serialNumber && !eyefiSerialId) {
          eyefiSerialId = await this.findOrCreateEyeFiSerial(connection, serialNumber);
        }

        const useManualAsset =
          assignment.generated_SG_asset &&
          String(assignment.generated_SG_asset).trim() !== '';

        let generatedAssetNumber = String(assignment.generated_SG_asset || '');

        if (!useManualAsset) {
          // Use the tracked sequence, increment it
          generatedAssetNumber = this.generateNextAgsSerialNumber(currentSequence, sequenceWeekNumber);
          currentSequence = Number(generatedAssetNumber.slice(-4)); // Extract last 4 digits for next iteration
          // After first generated value in a new week, keep subsequent rows incrementing.
          sequenceWeekNumber = this.getWeekNumber(nowDate);
        }

        const [insertResult] = await conn.execute<ResultSetHeader>(
          `
            INSERT INTO \`${TABLE}\` (
              timeStamp, poNumber, property_site, sgPartNumber,
              inspectorName, generated_SG_asset, serialNumber,
              lastUpdate, manualUpdate
            ) VALUES (
              :timeStamp, :poNumber, :property_site, :sgPartNumber,
              :inspectorName, :generated_SG_asset, :serialNumber,
              :lastUpdate, :manualUpdate
            )
          `,
          {
            timeStamp: nowDate,
            poNumber: assignment.poNumber || null,
            property_site: assignment.property_site || null,
            sgPartNumber: assignment.sgPartNumber || null,
            inspectorName: assignment.inspector_name || userFullName,
            generated_SG_asset: generatedAssetNumber,
            serialNumber: serialNumber || null,
            lastUpdate: nowDate,
            manualUpdate: useManualAsset ? '1' : null,
          },
        );

        if (!eyefiSerialId) {
          throw new Error('EyeFi serial is required to create serial assignment');
        }

        const ulLabel = await this.resolveAvailableUlLabel(conn, assignment);
        const serialAssignmentId = await this.createSerialAssignment(conn, {
          eyefiSerialId: Number(eyefiSerialId),
          eyefiSerialNumber: serialNumber,
          customerAssetId: Number(insertResult.insertId),
          generatedAssetNumber,
          assignment,
          batchId: `AGS-${Date.now()}`,
          userFullName,
          ulLabel,
        });

        if (eyefiSerialId) {
          await conn.execute(
            `
              UPDATE eyefi_serial_numbers
              SET status = 'assigned',
                  is_consumed = TRUE,
                  consumed_at = NOW(),
                  consumed_by = :consumed_by
              WHERE id = :id
                AND is_consumed = FALSE
            `,
            {
              id: eyefiSerialId,
              consumed_by: assignment.consumed_by || userFullName,
            },
          );
        }

        if (ulLabel) {
          await conn.execute(
            `
              UPDATE ul_labels
              SET is_consumed = TRUE,
                  consumed_at = NOW(),
                  consumed_by = :consumed_by
              WHERE id = :id
                AND is_consumed = FALSE
            `,
            {
              id: ulLabel.id,
              consumed_by: assignment.consumed_by || userFullName,
            },
          );
        }

        await conn.execute(
          `
            INSERT INTO \`${SERIAL_ASSIGNMENT_AUDIT_TABLE}\` (assignment_id, action, serial_type, serial_id, serial_number, reason, performed_by, performed_at)
            VALUES (:assignment_id, 'created', 'eyefi', :serial_id, :serial_number, 'Created from AGS serial assignment workflow', :performed_by, NOW())
          `,
          {
            assignment_id: serialAssignmentId,
            serial_id: eyefiSerialId,
            serial_number: serialNumber,
            performed_by: assignment.consumed_by || userFullName,
          },
        );

        rows.push({
          generated_asset_number: generatedAssetNumber,
          customer_asset_id: Number(insertResult.insertId),
          serialNumber: serialNumber || undefined,
        });
      }

      return rows;
    });

    return {
      success: true,
      message: 'Bulk AGS serials created successfully',
      count: result.length,
      data: result,
    };
  }
}

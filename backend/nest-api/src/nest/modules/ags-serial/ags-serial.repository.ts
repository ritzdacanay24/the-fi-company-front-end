import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { BulkCreateAgsSerialDto } from './dto/bulk-create-ags-serial.dto';
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

          const prev = lastRows[0];
          generatedAssetNumber = this.generateSerialNumber(
            Number(prev?.generatedAssetNumber || 999),
            this.getWeekNumber(String(prev?.dateCreated || nowDate)),
          );
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

        if (eyefiSerialId) {
          await conn.execute(
            `
              UPDATE eyefi_serial_numbers
              SET is_consumed = TRUE,
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

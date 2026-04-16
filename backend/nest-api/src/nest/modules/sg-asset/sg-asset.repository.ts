import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { BulkCreateSgAssetDto } from './dto/bulk-create-sg-asset.dto';
import { CreateSgAssetDto } from './dto/create-sg-asset.dto';
import { UpdateSgAssetDto } from './dto/update-sg-asset.dto';

export interface SgAssetRecord extends RowDataPacket {
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

@Injectable()
export class SgAssetRepository extends BaseRepository<SgAssetRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('sgAssetGenerator', mysqlService);
  }

  private resolvedSgTableName?: string;

  private async getSgTableName(): Promise<string> {
    if (this.resolvedSgTableName) {
      return this.resolvedSgTableName;
    }

    const rows = await this.rawQuery<RowDataPacket & { table_name: string }>(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND LOWER(table_name) IN (?, ?)
        ORDER BY CASE
          WHEN table_name = 'sgAssetGenerator' THEN 1
          WHEN table_name = 'sgassetgenerator' THEN 2
          WHEN table_name = 'sg_asset_generator' THEN 3
          ELSE 99
        END
        LIMIT 1
      `,
      ['sgassetgenerator', 'sg_asset_generator'],
    );

    const resolved = String(rows[0]?.table_name || 'sgAssetGenerator');
    if (!/^[A-Za-z0-9_]+$/.test(resolved)) {
      this.resolvedSgTableName = 'sgAssetGenerator';
      return '`sgAssetGenerator`';
    }

    this.resolvedSgTableName = resolved;
    return `\`${resolved}\``;
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

  async getList(params: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll?: boolean;
  }): Promise<SgAssetRecord[]> {
    const { selectedViewType, dateFrom, dateTo, isAll } = params;

    const table = await this.getSgTableName();
    let sql = `SELECT * FROM ${table} a WHERE 1=1`;
    const sqlParams: Array<string> = [];

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

    return this.rawQuery<SgAssetRecord>(sql, sqlParams);
  }

  async getById(id: number): Promise<SgAssetRecord | null> {
    const table = await this.getSgTableName();
    const rows = await this.rawQuery<SgAssetRecord>(
      `SELECT * FROM ${table} WHERE id = ? ORDER BY id DESC LIMIT 1`,
      [id],
    );

    return rows[0] || null;
  }

  async getAll(): Promise<SgAssetRecord[]> {
    const table = await this.getSgTableName();
    return this.rawQuery<SgAssetRecord>(`SELECT * FROM ${table} ORDER BY timeStamp DESC`);
  }

  async checkIfSerialIsFound(assetNumber: string): Promise<Pick<SgAssetRecord, 'generated_SG_asset'> | null> {
    const table = await this.getSgTableName();
    const rows = await this.rawQuery<RowDataPacket & { generated_SG_asset: string }>(
      `
        SELECT generated_SG_asset
        FROM ${table}
        WHERE generated_SG_asset = ?
        LIMIT 1
      `,
      [assetNumber],
    );

    return (rows[0] as Pick<SgAssetRecord, 'generated_SG_asset'>) || null;
  }

  private getWeekNumber(dateInput: string): string {
    const date = new Date(dateInput);
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return String(weekNo).padStart(2, '0');
  }

  private getYearNumber(dateInput: string): string {
    const date = new Date(dateInput);
    return String(date.getUTCFullYear());
  }

  private generateSerialNumber(
    previousSequence: number,
    lastRecordedWeekNumber: string,
    _lastRecordedYearNumber: string,
  ): string {
    const defaultFirst = 'US14';
    const current = new Date();
    const currentYear = String(current.getUTCFullYear()).slice(-2);
    const currentWeekNumber = this.getWeekNumber(current.toISOString());
    let sequence = '01';

    if (currentWeekNumber === String(lastRecordedWeekNumber).padStart(2, '0')) {
      sequence = String((previousSequence || 0) + 1).padStart(2, '0');
    }

    return `${defaultFirst}${currentWeekNumber}${currentYear}${sequence}`;
  }

  private async getLastGeneratedState(): Promise<{
    generatedAssetNumber: number;
    dateCreated: string;
  }> {
    const table = await this.getSgTableName();
    const rows = await this.rawQuery<RowDataPacket & { generatedAssetNumber: string; dateCreated: string }>(
      `
        SELECT RIGHT(generated_SG_asset, 2) AS generatedAssetNumber,
               DATE(timeStamp) AS dateCreated
        FROM ${table}
        WHERE manualUpdate IS NULL OR manualUpdate = ''
        ORDER BY id DESC
        LIMIT 1
      `,
    );

    const first = rows[0] as { generatedAssetNumber?: string; dateCreated?: string } | undefined;
    return {
      generatedAssetNumber: Number(first?.generatedAssetNumber || 0),
      dateCreated: String(first?.dateCreated || new Date().toISOString().slice(0, 10)),
    };
  }

  async createSgAsset(payload: CreateSgAssetDto, userFullName?: string): Promise<{ insertId: number }> {
    const table = await this.getSgTableName();
    const nowDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const basePayload: Record<string, unknown> = {
      ...payload,
      inspectorName: payload.inspectorName || userFullName || 'System',
      timeStamp: payload.timeStamp || nowDate,
      lastUpdate: payload.lastUpdate || nowDate,
    };

    if (!basePayload.generated_SG_asset) {
      const last = await this.getLastGeneratedState();
      const lastRecordedWeekNumber = this.getWeekNumber(last.dateCreated);
      const lastRecordedYearNumber = this.getYearNumber(last.dateCreated);
      basePayload.generated_SG_asset = this.generateSerialNumber(
        last.generatedAssetNumber,
        lastRecordedWeekNumber,
        lastRecordedYearNumber,
      );
    } else {
      basePayload.manualUpdate = true;
    }

    const sanitized = this.sanitizePayload(basePayload);
    const keys = Object.keys(sanitized);
    const values = Object.values(sanitized);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, values);

    const insertId = result.insertId;
    return { insertId };
  }

  async updateById(id: number, payload: UpdateSgAssetDto): Promise<number> {
    const table = await this.getSgTableName();
    const sanitized = this.sanitizePayload(payload as Record<string, unknown>);
    if (Object.keys(sanitized).length === 0) {
      return 0;
    }

    const keys = Object.keys(sanitized);
    const values = Object.values(sanitized);
    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [...values, id]);
    return result.affectedRows;
  }

  async deleteByIdHard(id: number): Promise<number> {
    const table = await this.getSgTableName();
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `DELETE FROM ${table} WHERE id = ?`,
      [id],
    );
    return result.affectedRows;
  }

  private async findOrCreateEyeFiSerial(connection: unknown, serialNumber: string): Promise<number | undefined> {
    if (!serialNumber) {
      return undefined;
    }

    const conn = connection as {
      execute: <T = unknown>(sql: string, params?: Record<string, unknown>) => Promise<[T, unknown]>;
    };

    const [existingRows] = await conn.execute<Array<RowDataPacket & { id: number }>>(
      `
        SELECT id
        FROM eyefi_serial_numbers
        WHERE serial_number = :serial_number
        LIMIT 1
      `,
      { serial_number: serialNumber },
    );

    const existing = existingRows[0];
    if (existing?.id) {
      return Number(existing.id);
    }

    const [insertResult] = await conn.execute<ResultSetHeader>(
      `
        INSERT INTO eyefi_serial_numbers (
          serial_number,
          status,
          is_consumed,
          created_at
        ) VALUES (:serial_number, 'available', FALSE, NOW())
      `,
      { serial_number: serialNumber },
    );

    return Number(insertResult.insertId);
  }

  async bulkCreate(payload: BulkCreateSgAssetDto): Promise<{
    success: boolean;
    message: string;
    count: number;
    data: Array<{ generated_asset_number: string; customer_asset_id: number; serialNumber?: string }>;
  }> {
    const table = await this.getSgTableName();
    const assignments = payload.assignments || [];
    const userFullName = payload.user_full_name || 'System';
    const nowDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const result = await this.mysqlService.withTransaction(async (connection) => {
      const rows: Array<{ generated_asset_number: string; customer_asset_id: number; serialNumber?: string }> = [];

      for (const assignment of assignments) {
        const serialNumber = String(assignment.serialNumber || '');
        let eyefiSerialId = assignment.eyefi_serial_id;

        if (serialNumber && !eyefiSerialId) {
          eyefiSerialId = await this.findOrCreateEyeFiSerial(connection, serialNumber);
        }

        const useManualAsset =
          (assignment.sgAssetNumber && String(assignment.sgAssetNumber).trim() !== '') ||
          (assignment.generated_SG_asset && String(assignment.generated_SG_asset).trim() !== '');

        let generatedAssetNumber = String(assignment.sgAssetNumber || assignment.generated_SG_asset || '');

        if (!useManualAsset) {
          const [lastRows] = await (
            connection as {
              execute: <T = unknown>(sql: string, params?: Record<string, unknown>) => Promise<[T, unknown]>;
            }
          ).execute<Array<RowDataPacket & { generatedAssetNumber: string; dateCreated: string }>>(
            `
              SELECT RIGHT(generated_SG_asset, 2) AS generatedAssetNumber,
                     DATE(timeStamp) AS dateCreated
              FROM ${table}
              WHERE manualUpdate IS NULL OR manualUpdate = ''
              ORDER BY id DESC
              LIMIT 1
            `,
          );

          const prev = lastRows[0];
          generatedAssetNumber = this.generateSerialNumber(
            Number(prev?.generatedAssetNumber || 0),
            this.getWeekNumber(String(prev?.dateCreated || nowDate)),
            this.getYearNumber(String(prev?.dateCreated || nowDate)),
          );
        }

        const [insertResult] = await (
          connection as {
            execute: <T = unknown>(sql: string, params?: Record<string, unknown>) => Promise<[T, unknown]>;
          }
        ).execute<ResultSetHeader>(
          `
            INSERT INTO ${table} (
              timeStamp,
              poNumber,
              property_site,
              sgPartNumber,
              inspectorName,
              generated_SG_asset,
              serialNumber,
              lastUpdate,
              manualUpdate
            ) VALUES (
              :timeStamp,
              :poNumber,
              :property_site,
              :sgPartNumber,
              :inspectorName,
              :generated_SG_asset,
              :serialNumber,
              :lastUpdate,
              :manualUpdate
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
          await (
            connection as {
              execute: <T = unknown>(sql: string, params?: Record<string, unknown>) => Promise<[T, unknown]>;
            }
          ).execute(
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
      message: 'Bulk sg assets created successfully',
      count: result.length,
      data: result,
    };
  }
}

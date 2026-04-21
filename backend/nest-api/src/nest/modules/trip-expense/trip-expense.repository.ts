import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export interface TripExpenseRecord extends RowDataPacket {
  id: number;
  workOrderId: number | null;
  fs_scheduler_id: number | null;
  fileName: string | null;
  link: string | null;
  created_by_name: string | null;
}

@Injectable()
export class TripExpenseRepository {
  private readonly tableName = 'eyefidb.fs_workOrderTrip';

  private readonly allowedColumns = new Set([
    'name',
    'cost',
    'workOrderId',
    'fs_scheduler_id',
    'vendor_name',
    'fileName',
    'locale',
    'date',
    'time',
    'transaction_id',
    'created_by',
    'split',
    'to_spit',
    'jobs',
    'fromId',
    'copiedFromTicketId',
    'fileCopied',
    'originalFileLink',
  ]);

  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  sanitizePayload(payload: Record<string, unknown> | null | undefined): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getByWorkOrderId(workOrderId: number): Promise<TripExpenseRecord[]> {
    return this.mysqlService.query<TripExpenseRecord[]>(
      `
        SELECT a.*, NULLIF(a.originalFileLink, '') AS link,
               'legacy' AS storage_source,
               CONCAT(b.first, ' ', b.last) AS created_by_name
        FROM fs_workOrderTrip a
        LEFT JOIN db.users b ON b.id = a.created_by
        WHERE a.workOrderId = ?
        ORDER BY a.date ASC, a.time ASC
      `,
      [workOrderId],
    );
  }

  async getByFsId(fsSchedulerId: number): Promise<TripExpenseRecord[]> {
    return this.mysqlService.query<TripExpenseRecord[]>(
      `
        SELECT a.*, NULLIF(a.originalFileLink, '') AS link,
               'legacy' AS storage_source,
               CONCAT(b.first, ' ', b.last) AS created_by_name,
               c.fs_scheduler_id
        FROM fs_workOrderTrip a
        LEFT JOIN db.users b ON b.id = a.created_by
        LEFT JOIN fs_workOrder c ON c.id = a.workOrderId
        WHERE c.fs_scheduler_id = ? OR a.fs_scheduler_id = ?
      `,
      [fsSchedulerId, fsSchedulerId],
    );
  }

  async getById(id: number): Promise<TripExpenseRecord | null> {
    const rows = await this.mysqlService.query<TripExpenseRecord[]>(
      `
        SELECT a.*, NULLIF(a.originalFileLink, '') AS link,
               'legacy' AS storage_source,
               CONCAT(b.first, ' ', b.last) AS created_by_name
        FROM fs_workOrderTrip a
        LEFT JOIN db.users b ON b.id = a.created_by
        WHERE a.id = ?
        LIMIT 1
      `,
      [id],
    );

    return rows[0] ?? null;
  }

  async create(payload: Record<string, unknown> | null | undefined): Promise<number> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Payload is empty');
    }

    const keys = Object.keys(payload);
    if (keys.length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const values = Object.values(payload);

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, values);
    return result.insertId;
  }

  async updateById(id: number, payload: Record<string, unknown> | null | undefined): Promise<number> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Payload is empty');
    }

    const keys = Object.keys(payload);
    if (keys.length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const values = Object.values(payload);

    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [...values, id]);
    return result.affectedRows;
  }

  async deleteById(id: number): Promise<number> {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [id]);
    return result.affectedRows;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class FsQirRepository {
  private readonly table = 'eyefidb.fs_qir';
  private readonly allowedColumns = new Set([
    'name',
    'description',
    'work_order_id',
    'created_date',
    'created_by',
  ]);

  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getByWorkOrderId(workOrderId: number): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(
      `SELECT * FROM ${this.table} WHERE work_order_id = ?`,
      [workOrderId],
    );
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT * FROM ${this.table} WHERE id = ? LIMIT 1`,
      [id],
    );

    return rows[0] ?? null;
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    const keys = Object.keys(payload);
    const values = Object.values(payload);
    const placeholders = keys.map(() => '?').join(', ');

    const result = await this.mysqlService.execute<ResultSetHeader>(
      `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`,
      values,
    );

    return result.insertId;
  }

  async updateById(id: number, payload: Record<string, unknown>): Promise<number> {
    const keys = Object.keys(payload);
    const values = Object.values(payload);
    const setClause = keys.map((key) => `${key} = ?`).join(', ');

    const result = await this.mysqlService.execute<ResultSetHeader>(
      `UPDATE ${this.table} SET ${setClause} WHERE id = ?`,
      [...values, id],
    );

    return result.affectedRows;
  }

  async deleteById(id: number): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `DELETE FROM ${this.table} WHERE id = ?`,
      [id],
    );

    return result.affectedRows;
  }
}

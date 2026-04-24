import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class TableSettingsRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async find(filters: Record<string, any>): Promise<RowDataPacket[]> {
    let sql = `
      SELECT a.*, CONCAT(b.first, ' ', b.last) AS created_by_user
      FROM tableSettings a
      LEFT JOIN db.users b ON b.id = a.userId
    `;
    const params: any[] = [];
    const conditions = Object.entries(filters);
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.map(([key]) => `a.${key} = ?`).join(' AND ');
      conditions.forEach(([, val]) => params.push(val));
    }
    return this.mysqlService.query(sql, params);
  }

  async findOne(filters: Record<string, any>): Promise<RowDataPacket | null> {
    let sql = `
      SELECT a.*, CONCAT(b.first, ' ', b.last) AS created_by_user
      FROM tableSettings a
      LEFT JOIN db.users b ON b.id = a.userId
    `;
    const params: any[] = [];
    const conditions = Object.entries(filters);
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.map(([key]) => `a.${key} = ?`).join(' AND ');
      conditions.forEach(([, val]) => params.push(val));
    }
    sql += ' LIMIT 1';
    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, params);
    return rows[0] ?? null;
  }

  async getAll(): Promise<RowDataPacket[]> {
    return this.mysqlService.query(
      `SELECT a.*, CONCAT(b.first, ' ', b.last) AS created_by_user
       FROM tableSettings a
       LEFT JOIN db.users b ON b.id = a.userId`,
    );
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT a.*, CONCAT(b.first, ' ', b.last) AS created_by_user
       FROM tableSettings a
       LEFT JOIN db.users b ON b.id = a.userId
       WHERE a.id = ?`,
      [id],
    );
    return rows[0] ?? null;
  }

  async getByIdAndUserId(id: number, userId: number): Promise<RowDataPacket | null> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT * FROM tableSettings WHERE id = ? AND userId = ? LIMIT 1`,
      [id, userId],
    );
    return rows[0] ?? null;
  }

  private serialize(value: any): any {
    if (value !== null && typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  }

  async create(payload: Record<string, any>): Promise<{ insertId: number }> {
    const keys = Object.keys(payload);
    const values = Object.values(payload).map((v) => this.serialize(v));
    const sql = `INSERT INTO tableSettings (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
    const result: any = await this.mysqlService.query(sql, values);
    return { insertId: result.insertId };
  }

  async update(id: number, data: Record<string, any>): Promise<void> {
    const entries = Object.entries(data);
    if (entries.length === 0) return;
    const sql = `UPDATE tableSettings SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`;
    await this.mysqlService.query(sql, [...entries.map(([, v]) => this.serialize(v)), id]);
  }

  async delete(id: number): Promise<void> {
    await this.mysqlService.query('DELETE FROM tableSettings WHERE id = ?', [id]);
  }
}

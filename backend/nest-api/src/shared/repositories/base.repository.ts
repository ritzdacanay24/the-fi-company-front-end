import { Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '../database/mysql.service';

@Injectable()
export abstract class BaseRepository<T extends RowDataPacket = RowDataPacket> {
  protected constructor(
    protected readonly tableName: string,
    protected readonly mysqlService: MysqlService,
    protected readonly primaryKey = 'id',
  ) {}

  protected quoteIdentifier(identifier: string): string {
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

  protected quoteTableName(tableName: string): string {
    return tableName
      .split('.')
      .map((segment) => this.quoteIdentifier(segment))
      .join('.');
  }

  async find(where: Record<string, unknown> = {}): Promise<T[]> {
    const keys = Object.keys(where);

    const tableName = this.quoteTableName(this.tableName);
    const primaryKey = this.quoteIdentifier(this.primaryKey);

    let sql = `SELECT * FROM ${tableName}`;
    const params: unknown[] = [];

    if (keys.length > 0) {
      const clauses = keys.map((key) => {
        params.push(where[key]);
        return `${this.quoteIdentifier(key)} = ?`;
      });
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    sql += ` ORDER BY ${primaryKey} DESC`;

    return await this.mysqlService.query<T[]>(sql, params);
  }

  async findOne(where: Record<string, unknown>): Promise<T | null> {
    const keys = Object.keys(where);
    if (keys.length === 0) {
      return null;
    }

    const tableName = this.quoteTableName(this.tableName);
    const primaryKey = this.quoteIdentifier(this.primaryKey);

    const params: unknown[] = [];
    const clauses = keys.map((key) => {
      params.push(where[key]);
      return `${this.quoteIdentifier(key)} = ?`;
    });

    const sql = `SELECT * FROM ${tableName} WHERE ${clauses.join(' AND ')} ORDER BY ${primaryKey} DESC LIMIT 1`;
    const rows = await this.mysqlService.query<T[]>(sql, params);
    return rows[0] || null;
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    const keys = Object.keys(payload);
    const values = Object.values(payload);

    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.map((key) => this.quoteIdentifier(key)).join(', ');
    const tableName = this.quoteTableName(this.tableName);

    const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, values);
    return result.insertId;
  }

  async updateById(id: number | string, payload: Record<string, unknown>): Promise<number> {
    const keys = Object.keys(payload);
    const values = Object.values(payload);

    const setClause = keys.map((key) => `${this.quoteIdentifier(key)} = ?`).join(', ');
    const tableName = this.quoteTableName(this.tableName);
    const primaryKey = this.quoteIdentifier(this.primaryKey);
    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${primaryKey} = ?`;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [...values, id]);
    return result.affectedRows;
  }

  async deleteById(id: number | string): Promise<number> {
    const tableName = this.quoteTableName(this.tableName);
    const primaryKey = this.quoteIdentifier(this.primaryKey);
    const sql = `DELETE FROM ${tableName} WHERE ${primaryKey} = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [id]);
    return result.affectedRows;
  }

  protected async rawQuery<R extends RowDataPacket = RowDataPacket>(sql: string, params: unknown[] = []): Promise<R[]> {
    return await this.mysqlService.query<R[]>(sql, params);
  }
}

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import mysql, { Pool, QueryResult } from 'mysql2/promise';

@Injectable()
export class MysqlService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'mysql',
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME || 'eyefidb',
      user: process.env.DB_USER || 'change_me',
      password: process.env.DB_PASSWORD || 'change_me',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async query<T extends QueryResult = QueryResult>(sql: string, params: readonly unknown[] = []): Promise<T> {
    const [rows] = await this.pool.query<T>(sql, params as never[]);
    return rows;
  }

  async execute<T extends QueryResult = QueryResult>(sql: string, params: readonly unknown[] = []): Promise<T> {
    const [rows] = await this.pool.execute<T>(sql, params as never[]);
    return rows;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

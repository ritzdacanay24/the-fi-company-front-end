import { Injectable } from '@nestjs/common';
import odbc from 'odbc';

type QadResultKeyCase = 'preserve' | 'lower' | 'upper';

type QadQueryOptions = {
  keyCase?: QadResultKeyCase;
};

@Injectable()
export class QadOdbcService {
  private connectionString(): string {
    const dsn = process.env.QAD_DSN || 'DEV';
    const user = process.env.QAD_USER || 'change_me';
    const password = process.env.QAD_PASSWORD || 'change_me';

    return `DSN=${dsn};UID=${user};PWD=${password}`;
  }

  private async withConnection<T>(work: (conn: odbc.Connection) => Promise<T>): Promise<T> {
    const conn = await odbc.connect(this.connectionString());
    try {
      return await work(conn);
    } finally {
      await conn.close();
    }
  }

  async query<T = Record<string, unknown>[]>(sql: string, options?: QadQueryOptions): Promise<T> {
    return this.withConnection(async (conn) => {
      const rows = (await conn.query(sql)) as T;
      return this.normalizeKeys(rows, options?.keyCase || 'preserve');
    });
  }

  async queryWithParams<T = Record<string, unknown>[]>(
    sql: string,
    params: readonly (string | number)[],
    options?: QadQueryOptions,
  ): Promise<T> {
    return this.withConnection(async (conn) => {
      const rows = (await conn.query(sql, [...params])) as T;
      return this.normalizeKeys(rows, options?.keyCase || 'preserve');
    });
  }

  private normalizeKeys<T>(rows: T, keyCase: QadResultKeyCase): T {
    if (keyCase === 'preserve' || !Array.isArray(rows)) {
      return rows;
    }

    const normalized = rows.map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return row;
      }

      const entries = Object.entries(row as Record<string, unknown>).map(([key, value]) => [
        keyCase === 'upper' ? key.toUpperCase() : key.toLowerCase(),
        value,
      ]);

      return Object.fromEntries(entries);
    });

    return normalized as T;
  }
}

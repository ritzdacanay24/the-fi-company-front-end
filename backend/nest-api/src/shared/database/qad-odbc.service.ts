import { Injectable } from '@nestjs/common';
import odbc from 'odbc';

type QadResultKeyCase = 'preserve' | 'lower' | 'upper';

type QadQueryOptions = {
  keyCase?: QadResultKeyCase;
};

@Injectable()
export class QadOdbcService {
  private connectTimeoutMs(): number {
    const raw = Number(process.env.QAD_CONNECT_TIMEOUT_MS || 3000);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 3000;
  }

  private connectTimeoutSeconds(): number {
    return Math.max(1, Math.ceil(this.connectTimeoutMs() / 1000));
  }

  private connectionString(): string {
    const dsn = process.env.QAD_DSN || 'DEV';
    const user = process.env.QAD_USER || 'change_me';
    const password = process.env.QAD_PASSWORD || 'change_me';
    const loginTimeout = this.connectTimeoutSeconds();

    return `DSN=${dsn};UID=${user};PWD=${password};LoginTimeout=${loginTimeout};ConnectionTimeout=${loginTimeout}`;
  }

  private async connectWithTimeout(): Promise<odbc.Connection> {
    const timeoutMs = this.connectTimeoutMs();
    let didTimeout = false;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        didTimeout = true;
        reject(new Error(`[odbc] Connection timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      odbc
        .connect(this.connectionString())
        .then((conn) => {
          if (didTimeout) {
            void conn.close().catch(() => undefined);
            return;
          }

          clearTimeout(timer);
          resolve(conn);
        })
        .catch((error) => {
          if (didTimeout) {
            return;
          }

          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async withConnection<T>(work: (conn: odbc.Connection) => Promise<T>): Promise<T> {
    const conn = await this.connectWithTimeout();
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

import { Injectable, Logger } from '@nestjs/common';
import odbc from 'odbc';

type QadResultKeyCase = 'preserve' | 'lower' | 'upper';

type QadQueryOptions = {
  keyCase?: QadResultKeyCase;
};

@Injectable()
export class QadOdbcService {
  private readonly logger = new Logger(QadOdbcService.name);
  private poolPromise: Promise<odbc.Pool> | null = null;
  private recoverableErrorCount = 0;
  private poolResetCount = 0;
  private retrySuccessCount = 0;
  private retryFailureCount = 0;
  private lastRecoverableErrorAt: string | null = null;

  getRecoveryStats(): Record<string, unknown> {
    return {
      recoverableErrorCount: this.recoverableErrorCount,
      poolResetCount: this.poolResetCount,
      retrySuccessCount: this.retrySuccessCount,
      retryFailureCount: this.retryFailureCount,
      lastRecoverableErrorAt: this.lastRecoverableErrorAt,
    };
  }

  private connectionString(): string {
    const dsn = process.env.QAD_DSN || 'DEV';
    const user = process.env.QAD_USER || 'change_me';
    const password = process.env.QAD_PASSWORD || 'change_me';
    return `DSN=${dsn};UID=${user};PWD=${password}`;
  }

  private async getPool(): Promise<odbc.Pool> {
    if (!this.poolPromise) {
      this.poolPromise = odbc.pool(this.connectionString());
    }
    return this.poolPromise;
  }

  private async resetPool(): Promise<void> {
    const currentPoolPromise = this.poolPromise;
    this.poolPromise = null;
    this.poolResetCount += 1;

    if (!currentPoolPromise) {
      return;
    }

    try {
      const pool = await currentPoolPromise;
      await pool.close();
    } catch {
      // Ignore cleanup errors. The goal is to force the next call to recreate the pool.
    }
  }

  private isRecoverableError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const record = error as Record<string, unknown>;
    const message = String(record.message || '').toLowerCase();
    const odbcErrors = Array.isArray(record.odbcErrors)
      ? (record.odbcErrors as Array<Record<string, unknown>>)
      : [];

    if (/ssl i\/o error|communication link failure|connection.*failed|socket/i.test(message)) {
      return true;
    }

    return odbcErrors.some((entry) => {
      const state = String(entry.state || '').toUpperCase();
      const entryMessage = String(entry.message || '').toLowerCase();

      return (
        state.startsWith('08') ||
        state === 'HYT00' ||
        state === 'HYT01' ||
        /ssl i\/o error|communication link failure|connection.*failed|socket/i.test(entryMessage)
      );
    });
  }

  private async withConnection<T>(
    work: (conn: odbc.Connection) => Promise<T>,
    allowRetry = true,
  ): Promise<T> {
    const pool = await this.getPool();
    let conn: odbc.Connection | null = null;

    try {
      conn = await pool.connect();
      return await work(conn);
    } catch (error) {
      if (allowRetry && this.isRecoverableError(error)) {
        this.recoverableErrorCount += 1;
        this.lastRecoverableErrorAt = new Date().toISOString();

        this.logger.warn(
          `Recoverable QAD ODBC error detected. Resetting pool and retrying once. ` +
            `(recoverable=${this.recoverableErrorCount}, poolResets=${this.poolResetCount + 1})`,
        );

        await this.resetPool();

        try {
          const result = await this.withConnection(work, false);
          this.retrySuccessCount += 1;
          return result;
        } catch (retryError) {
          this.retryFailureCount += 1;
          throw retryError;
        }
      }

      throw error;
    } finally {
      if (conn) {
        await conn.close();
      }
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

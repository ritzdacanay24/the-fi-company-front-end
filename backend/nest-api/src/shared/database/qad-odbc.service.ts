import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import odbc from 'odbc';

type QadResultKeyCase = 'preserve' | 'lower' | 'upper';

type QadQueryOptions = {
  keyCase?: QadResultKeyCase;
};

@Injectable()
export class QadOdbcService {
  private readonly logger = new Logger(QadOdbcService.name);
  private poolPromise: Promise<odbc.Pool> | null = null;
  private poolCreatedAtMs: number | null = null;
  private recoverableErrorCount = 0;
  private poolResetCount = 0;
  private proactivePoolResetCount = 0;
  private retrySuccessCount = 0;
  private retryFailureCount = 0;
  private lastRecoverableErrorAt: string | null = null;
  private readonly poolMaxAgeMs = this.readPoolMaxAgeMs();

  getRecoveryStats(): Record<string, unknown> {
    return {
      recoverableErrorCount: this.recoverableErrorCount,
      poolResetCount: this.poolResetCount,
      proactivePoolResetCount: this.proactivePoolResetCount,
      retrySuccessCount: this.retrySuccessCount,
      retryFailureCount: this.retryFailureCount,
      lastRecoverableErrorAt: this.lastRecoverableErrorAt,
      poolMaxAgeMs: this.poolMaxAgeMs,
      currentPoolAgeMs: this.poolCreatedAtMs ? Date.now() - this.poolCreatedAtMs : null,
    };
  }

  private readPoolMaxAgeMs(): number {
    const raw = Number(process.env.QAD_POOL_MAX_AGE_MS ?? 30 * 60 * 1000);

    if (!Number.isFinite(raw) || raw < 60_000) {
      return 30 * 60 * 1000;
    }

    return raw;
  }

  private connectionString(): string {
    const dsn = process.env.QAD_DSN || 'DEV';
    const user = process.env.QAD_USER || 'change_me';
    const password = process.env.QAD_PASSWORD || 'change_me';
    return `DSN=${dsn};UID=${user};PWD=${password}`;
  }

  private async getPool(): Promise<odbc.Pool> {
    await this.recyclePoolIfExpired();

    if (!this.poolPromise) {
      this.poolPromise = odbc.pool(this.connectionString());
      this.poolCreatedAtMs = Date.now();
    }
    return this.poolPromise;
  }

  private async recyclePoolIfExpired(): Promise<void> {
    if (!this.poolPromise || !this.poolCreatedAtMs) {
      return;
    }

    const ageMs = Date.now() - this.poolCreatedAtMs;
    if (ageMs < this.poolMaxAgeMs) {
      return;
    }

    this.proactivePoolResetCount += 1;
    this.logger.log(
      `Recycling QAD ODBC pool after ${ageMs}ms (maxAge=${this.poolMaxAgeMs}ms, proactiveResets=${this.proactivePoolResetCount})`,
    );
    await this.resetPool();
  }

  private async resetPool(): Promise<void> {
    const currentPoolPromise = this.poolPromise;
    this.poolPromise = null;
    this.poolCreatedAtMs = null;

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

        this.poolResetCount += 1;
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

  private summarizeSql(sql: string): string {
    return String(sql || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 400);
  }

  private formatOdbcError(error: unknown): {
    message: string;
    diagnostics: Array<Record<string, unknown>>;
  } {
    const fallbackMessage = error instanceof Error ? error.message : String(error || 'Unknown ODBC error');
    const record = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
    const diagnostics = Array.isArray(record.odbcErrors)
      ? (record.odbcErrors as Array<Record<string, unknown>>).map((entry) => ({
          state: entry.state,
          code: entry.code,
          message: entry.message,
        }))
      : [];

    const firstDiagnostic = diagnostics[0];
    const message = firstDiagnostic?.message
      ? String(firstDiagnostic.message)
      : fallbackMessage;

    return { message, diagnostics };
  }

  async query<T = Record<string, unknown>[]>(sql: string, options?: QadQueryOptions): Promise<T> {
    try {
      return await this.withConnection(async (conn) => {
        const rows = (await conn.query(sql)) as T;
        return this.normalizeKeys(rows, options?.keyCase || 'preserve');
      });
    } catch (error) {
      const { message, diagnostics } = this.formatOdbcError(error);
      throw new InternalServerErrorException({
        code: 'RC_QAD_ODBC_QUERY_FAILED',
        message: `QAD ODBC query failed: ${message}`,
        details: {
          source: 'qad-odbc',
          sqlSnippet: this.summarizeSql(sql),
          diagnostics,
        },
      });
    }
  }

  async queryWithParams<T = Record<string, unknown>[]>(
    sql: string,
    params: readonly (string | number)[],
    options?: QadQueryOptions,
  ): Promise<T> {
    try {
      return await this.withConnection(async (conn) => {
        const rows = (await conn.query(sql, [...params])) as T;
        return this.normalizeKeys(rows, options?.keyCase || 'preserve');
      });
    } catch (error) {
      const { message, diagnostics } = this.formatOdbcError(error);
      throw new InternalServerErrorException({
        code: 'RC_QAD_ODBC_QUERY_FAILED',
        message: `QAD ODBC query failed: ${message}`,
        details: {
          source: 'qad-odbc',
          sqlSnippet: this.summarizeSql(sql),
          params: [...params],
          diagnostics,
        },
      });
    }
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

import { Injectable } from '@nestjs/common';
import odbc from 'odbc';

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

  async query<T = Record<string, unknown>[]>(sql: string): Promise<T> {
    return this.withConnection(async (conn) => {
      const rows = (await conn.query(sql)) as T;
      return rows;
    });
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

interface DataScrubQueryRow extends RowDataPacket {
  name: string;
  query: string;
}

@Injectable()
export class DataScrubService {
  constructor(
    @Inject(MysqlService)
    private readonly mysqlService: MysqlService,
    @Inject(QadOdbcService)
    private readonly qadOdbcService: QadOdbcService,
  ) {}

  async getByType(type: string): Promise<unknown> {
    const rows = await this.mysqlService.query<DataScrubQueryRow[]>(
      `
        SELECT name, query
        FROM eyefidb.data_scrub
        WHERE name = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [type],
    );

    const queryRow = rows[0];
    if (!queryRow?.query) {
      throw new NotFoundException({
        code: 'RC_DATASCRUB_QUERY_NOT_FOUND',
        message: `No DataScrub query found for type: ${type}`,
      });
    }

    const qadSql = queryRow.query.replace(/\r\n/g, '');
    const result = await this.qadOdbcService.query<Record<string, unknown>[]>(qadSql);
    return this.normalizeBigInt(result);
  }

  private normalizeBigInt(value: unknown): unknown {
    if (typeof value === 'bigint') {
      return Number(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeBigInt(item));
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      return Object.fromEntries(
        entries.map(([key, entryValue]) => [key, this.normalizeBigInt(entryValue)]),
      );
    }

    return value;
  }
}

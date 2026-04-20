import { BadRequestException, Injectable } from '@nestjs/common';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { QadTablesRepository } from './qad-tables.repository';

@Injectable()
export class QadTablesService {
  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly repository: QadTablesRepository,
  ) {}

  async read() {
    const result = await this.repository.getQadTableNames();
    const queries = await this.repository.getSavedQueries();

    const normalized = result.map((row) => ({
      ...row,
      status: Number(row.status) === 1,
      noData: Number(row.noData) === 1,
    }));

    return {
      result: normalized,
      queries,
    };
  }

  async runQuery(query: string) {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      return [];
    }

    return this.qadOdbcService.query<Record<string, unknown>[]>(trimmed);
  }

  async test(tableName: string) {
    const name = (tableName || '').trim();
    if (!name || !/^[A-Za-z0-9_]+$/.test(name)) {
      throw new BadRequestException('Invalid table name');
    }

    return this.qadOdbcService.query<Record<string, unknown>[]>(
      `SELECT TOP 2 * FROM ${name}`,
    );
  }
}

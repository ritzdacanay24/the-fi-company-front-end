import { Inject, Injectable } from '@nestjs/common';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

@Injectable()
export class ShipToAddressService {
  constructor(
    @Inject(QadOdbcService) private readonly qadOdbcService: QadOdbcService,
  ) {}

  async read(addressCode: string): Promise<Record<string, unknown> | null> {
    const sql = `
      SELECT *
      FROM ad_mstr
      WHERE ad_addr = ?
        AND ad_domain = 'EYE'
      WITH (NOLOCK)
    `;

    const rows = await this.qadOdbcService.queryWithParams<Array<Record<string, unknown>>>(
      sql,
      [addressCode],
      { keyCase: 'lower' },
    );

    return this.toJsonSafe(rows[0] || null);
  }

  private toJsonSafe<T>(value: T): T {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'bigint') {
      return value.toString() as T;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toJsonSafe(item)) as T;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        this.toJsonSafe(item),
      ]);
      return Object.fromEntries(entries) as T;
    }

    return value;
  }
}

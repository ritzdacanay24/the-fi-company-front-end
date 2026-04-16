import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

const TABLE = 'eyefi_asset_numbers';

@Injectable()
export class EyeFiAssetNumbersRepository extends BaseRepository<RowDataPacket> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super(TABLE, mysqlService);
  }

  async getAvailable(status = 'available', category?: string, limit = 100): Promise<RowDataPacket[]> {
    let sql = `SELECT * FROM \`${TABLE}\` WHERE status = ?`;
    const params: unknown[] = [status];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ` ORDER BY generation_date ASC, daily_sequence ASC LIMIT ${Math.max(1, Math.floor(limit))}`;

    return this.rawQuery<RowDataPacket>(sql, params);
  }

  async getNextDailySequence(date: string): Promise<number> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT MAX(daily_sequence) AS max_seq FROM \`${TABLE}\` WHERE generation_date = ?`,
      [date],
    );
    return ((rows[0]?.['max_seq'] as number | null) ?? 0) + 1;
  }

  async generate(date: string, quantity: number, category: string): Promise<string[]> {
    const generated: string[] = [];

    await this.mysqlService.withTransaction(async (conn) => {
      const [[row]] = await conn.execute<RowDataPacket[]>(
        `SELECT COALESCE(MAX(daily_sequence), 0) AS max_seq FROM \`${TABLE}\` WHERE generation_date = ? FOR UPDATE`,
        [date],
      );
      let nextSeq: number = (row['max_seq'] as number) + 1;

      const dateFormatted = date.replace(/-/g, ''); // YYYYMMDD

      for (let i = 0; i < quantity; i++) {
        const seq = String(nextSeq).padStart(3, '0');
        const assetNumber = `${dateFormatted}${seq}`;

        await conn.execute<ResultSetHeader>(
          `INSERT INTO \`${TABLE}\` (asset_number, generation_date, daily_sequence, status, category, created_by)
           VALUES (?, ?, ?, 'available', ?, 'api')`,
          [assetNumber, date, nextSeq, category],
        );

        generated.push(assetNumber);
        nextSeq++;
      }
    });

    return generated;
  }
}

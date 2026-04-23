import { Injectable } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

type UserTransactionRow = RowDataPacket & Record<string, unknown>;
type CountRow = RowDataPacket & { hits?: number | string | null };

@Injectable()
export class UserTransactionsRepository extends BaseRepository<RowDataPacket> {
  constructor(mysqlService: MysqlService) {
    super('eyefidb.userTrans', mysqlService, 'id');
  }

  async getUpdatedOwnerTransactions(so: string): Promise<UserTransactionRow[]> {
    const sql = `
      SELECT a.id
        , a.field
        , a.o
        , a.n
        , a.createDate
        , a.comment
        , a.userId
        , a.so
        , a.type
        , a.partNumber
        , a.reasonCode
        , CONCAT(b.first, ' ', b.last) createdByFullName
      FROM eyefidb.userTrans a
      LEFT JOIN db.users b ON a.userId = b.id
      WHERE a.field = ?
        AND a.so = ?
      ORDER BY a.id DESC
    `;

    return this.rawQuery<UserTransactionRow>(sql, ['Updated Owner', so]);
  }

  /**
   * Insert user transaction records (audit trail)
   */
  async insertTransactions(
    rows: Array<Record<string, unknown>>,
    connection: PoolConnection,
  ): Promise<void> {
    if (!rows.length) {
      return;
    }

    const now = this.nowDateTime();
    const sql = `
      INSERT INTO eyefidb.userTrans (
        field, o, n, createDate, comment, userId, so, type, partNumber
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const row of rows) {
      await connection.execute<ResultSetHeader>(sql, [
        String(row.field || ''),
        String(row.o || ''),
        String(row.n || ''),
        now,
        String(row.comment || ''),
        Number(row.userId || 0),
        String(row.so || ''),
        String(row.type || ''),
        String(row.partNumber || ''),
      ] as any[]);
    }
  }

  /**
   * Get transaction records for a given SO and optional field filter
   */
  async getByField(so: string, field?: string): Promise<UserTransactionRow[]> {
    let sql = `
      SELECT *
      FROM eyefidb.userTrans
      WHERE so = ?
    `;
    const params: any[] = [so];

    if (field) {
      sql += ` AND field = ?`;
      params.push(field);
    }

    sql += ` ORDER BY createDate DESC`;
    return this.rawQuery<UserTransactionRow>(sql, params);
  }

  /**
   * Get transaction counts for today by SO
   */
  async getChangesToday(type: string, excludeField?: string): Promise<UserTransactionRow[]> {
    let sql = `
      SELECT so, COUNT(*) hits
      FROM eyefidb.userTrans
      WHERE type = ?
        AND DATE(createDate) = DATE(NOW())
    `;
    const params: any[] = [type];

    if (excludeField) {
      sql += ` AND field != ?`;
      params.push(excludeField);
    }

    sql += ` GROUP BY so`;
    return this.rawQuery<UserTransactionRow>(sql, params);
  }

  /**
   * Get transaction count for a specific field change
   */
  async getChangeCount(so: string, field: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) hits
      FROM eyefidb.userTrans
      WHERE so = ? AND field = ?
    `;
    const rows = await this.rawQuery<CountRow>(sql, [so, field]);
    return rows[0]?.hits ? Number(rows[0].hits) : 0;
  }

  private nowDateTime(): string {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
}

import { Injectable } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

type GenericRow = Record<string, unknown>;

@Injectable()
export class WorkOrderOwnerRepository extends BaseRepository<RowDataPacket> {
  constructor(mysqlService: MysqlService) {
    super('eyefidb.workOrderOwner', mysqlService, 'id');
  }

  async findOneBySo(so: string): Promise<GenericRow | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      'SELECT * FROM eyefidb.workOrderOwner WHERE so = ? LIMIT 1',
      [so],
    );
    return (rows[0] as GenericRow) || null;
  }

  /**
   * Fetch workOrderOwner by SO
   */
  async getBySo(so: string, connection: PoolConnection): Promise<GenericRow | null> {
    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM eyefidb.workOrderOwner WHERE so = ? LIMIT 1',
      [so],
    );
    return rows[0] || null;
  }

  /**
   * Fetch multiple workOrderOwner records by SO IDs
   */
  async getBySoArray(ids: string[]): Promise<GenericRow[]> {
    if (!ids.length) {
      return [];
    }
    const placeholders = ids.map(() => '?').join(', ');
    const sql = `
      SELECT *
      FROM eyefidb.workOrderOwner
      WHERE so IN (${placeholders})
    `;
    return this.rawQuery<RowDataPacket>(sql, ids) as unknown as GenericRow[];
  }

  /**
   * Update workOrderOwner record within transaction
   */
  async updateBySo(
    so: string,
    fields: GenericRow,
    connection: PoolConnection,
  ): Promise<void> {
    if (!Object.keys(fields).length) {
      throw new Error('No fields provided for update');
    }

    const setSql = Object.keys(fields)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(fields), so];

    const result = await connection.execute<ResultSetHeader>(
      `UPDATE eyefidb.workOrderOwner SET ${setSql} WHERE so = ?`,
      values as any[],
    );

    if (!result[0].affectedRows) {
      throw new Error(`Failed to update workOrderOwner: no record found for SO "${so}"`);
    }
  }

  /**
   * Insert new workOrderOwner record within transaction.
   * Uses ON DUPLICATE KEY UPDATE to avoid race conditions when two concurrent
   * requests both see no existing row and then both attempt an INSERT.
   */
  async createWithConnection(row: GenericRow, connection: PoolConnection): Promise<void> {
    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    const insertValues = Object.values(row);

    // On duplicate key (so), update all columns except the immutable ones.
    const updateColumns = columns.filter((c) => c !== 'so' && c !== 'createdDate' && c !== 'createdBy');
    const updateSql = updateColumns.map((c) => `${c} = VALUES(${c})`).join(', ');

    const sql = `
      INSERT INTO eyefidb.workOrderOwner (${columns.join(', ')})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE ${updateSql}
    `;

    await connection.execute<ResultSetHeader>(sql, insertValues as any[]);
  }
}

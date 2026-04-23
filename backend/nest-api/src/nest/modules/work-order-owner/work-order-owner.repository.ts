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
    const setSql = Object.keys(fields)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(fields), so];

    await connection.execute<ResultSetHeader>(
      `UPDATE eyefidb.workOrderOwner SET ${setSql} WHERE so = ?`,
      values as any[],
    );
  }

  /**
   * Insert new workOrderOwner record within transaction
   */
  async createWithConnection(row: GenericRow, connection: PoolConnection): Promise<void> {
    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(row);

    await connection.execute<ResultSetHeader>(
      `INSERT INTO eyefidb.workOrderOwner (${columns.join(', ')}) VALUES (${placeholders})`,
      values as any[],
    );
  }
}

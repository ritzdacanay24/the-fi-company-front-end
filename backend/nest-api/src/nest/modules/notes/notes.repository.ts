import { Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

type GenericRow = Record<string, unknown>;

@Injectable()
export class NotesRepository {
  constructor(private readonly mysqlService: MysqlService) {}

  async getById(so: string, userId: string | number): Promise<GenericRow[]> {
    const sql = `
      SELECT a.id,
        a.notes,
        a.createdDate,
        a.createdBy,
        CONCAT(b.first, ' ', b.last) createdByName,
        a.uniqueId,
        a.type
      FROM eyefidb.notes a
      LEFT JOIN db.users b ON b.id = a.createdBy
      WHERE a.uniqueId = ?
        AND a.type = 'Sales Order'
        AND a.createdBy = ?
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [so, userId]);
  }

  async insert(data: {
    notes: string;
    createdBy: string | number;
    uniqueId: string;
    type: string;
  }): Promise<number> {
    const sql = `
      INSERT INTO eyefidb.notes (
        notes,
        createdBy,
        uniqueId,
        type
      ) VALUES (?, ?, ?, ?)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      data.notes,
      data.createdBy,
      data.uniqueId,
      data.type,
    ]);

    return Number(result.insertId);
  }

  /**
   * Get latest notes by unique IDs (SO numbers), scoped strictly to a single user.
   */
  async getLatestByUniqueIds(ids: string[], userId: number): Promise<GenericRow[]> {
    if (!ids.length) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(', ');
    const sql = `
      SELECT a.uniqueId
        , a.notes
        , a.createdDate
        , DATE(a.createdDate) byDate
        , CONCAT(c.first, ' ', c.last) createdByName
        , a.id
        , a.type
        , a.createdBy
      FROM eyefidb.notes a
      LEFT JOIN db.users c ON c.id = a.createdBy
      INNER JOIN (
        SELECT uniqueId
          , MAX(id) id
        FROM eyefidb.notes
        WHERE uniqueId IN (${placeholders})
          AND createdBy = ?
        GROUP BY uniqueId
      ) b ON a.uniqueId = b.uniqueId AND a.id = b.id
      WHERE a.uniqueId IN (${placeholders})
        AND a.createdBy = ?
      ORDER BY a.createdDate DESC
    `;
    return this.mysqlService.query<RowDataPacket[]>(sql, [...ids, userId, ...ids, userId]);
  }
}

import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

type GenericRow = Record<string, unknown>;

@Injectable()
export class NotesRepository {
  constructor(private readonly mysqlService: MysqlService) {}

  /**
   * Get latest notes by unique IDs (SO numbers)
   */
  async getLatestByUniqueIds(ids: string[]): Promise<GenericRow[]> {
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
        GROUP BY uniqueId
      ) b ON a.uniqueId = b.uniqueId AND a.id = b.id
      WHERE a.uniqueId IN (${placeholders})
      ORDER BY a.createdDate DESC
    `;
    return this.mysqlService.query<RowDataPacket[]>(sql, [...ids, ...ids]);
  }
}

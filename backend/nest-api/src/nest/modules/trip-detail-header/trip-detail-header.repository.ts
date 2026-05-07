import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class TripDetailHeaderRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set(['fsId', 'group_name']);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_travel_header', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getAll(): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT a.id,
              a.group_name,
              b.fsIds,
              b.total_stops
       FROM eyefidb.fs_travel_header a
       LEFT JOIN (
         SELECT fs_travel_header_id,
                GROUP_CONCAT(DISTINCT fsId) AS fsIds,
                COUNT(*) AS total_stops
         FROM eyefidb.fs_travel_det
         GROUP BY fs_travel_header_id
       ) b ON b.fs_travel_header_id = a.id
       ORDER BY a.id DESC`,
    );
  }

  async createDefaultRow(): Promise<number> {
    const sql = `INSERT INTO ${this.tableName} () VALUES ()`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, []);
    return result.insertId;
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    return this.findOne({ id });
  }

  async getByGroup(): Promise<RowDataPacket | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT a.id, a.group_name, b.fs_travel_header_id, fsIds
       FROM eyefidb.fs_travel_header a
       LEFT JOIN (
         SELECT fs_travel_header_id, GROUP_CONCAT(DISTINCT fsId) fsIds
         FROM eyefidb.fs_travel_det
         GROUP BY fs_travel_header_id
       ) b ON b.fs_travel_header_id = a.id
       LIMIT 1`,
    );

    return rows[0] ?? null;
  }

  async multipleGroups(id: number): Promise<RowDataPacket | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT fsId, COUNT(DISTINCT fs_travel_header_id) AS total_different_groups
       FROM eyefidb.fs_travel_det
       WHERE fsId = ? AND fs_travel_header_id != ''
       GROUP BY fsId
       HAVING total_different_groups > 1`,
      [String(id)],
    );

    return rows[0] ?? null;
  }
}

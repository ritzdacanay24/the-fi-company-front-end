import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class TeamRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set([
    'fs_det_id',
    'user',
    'user_rate',
    'active',
    'lead_tech',
    'contractor_code',
    'user_rate_ot',
    'outside',
    'user_id',
    'ticket_verified',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_team', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async findInView(where: Record<string, unknown> = {}): Promise<RowDataPacket[]> {
    const keys = Object.keys(where);
    let sql = 'SELECT * FROM eyefidb.view_fs_team';
    const params: unknown[] = [];

    if (keys.length > 0) {
      const clauses = keys.map((key) => {
        params.push(where[key]);
        return `${key} = ?`;
      });
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    sql += ' ORDER BY id DESC';
    return this.rawQuery<RowDataPacket>(sql, params);
  }

  async findOneInView(id: number): Promise<RowDataPacket | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      'SELECT * FROM eyefidb.view_fs_team WHERE id = ? LIMIT 1',
      [id],
    );

    return rows[0] ?? null;
  }

  async getByFsId(fsDetId: number): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      'SELECT * FROM eyefidb.view_fs_team WHERE fs_det_id = ?',
      [fsDetId],
    );
  }

  async getByWorkOrderId(workOrderId: number): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT t.*
       FROM eyefidb.view_fs_team t
       INNER JOIN eyefidb.fs_workOrder w ON w.fs_scheduler_id = t.fs_det_id
       WHERE w.id = ?`,
      [workOrderId],
    );
  }
}

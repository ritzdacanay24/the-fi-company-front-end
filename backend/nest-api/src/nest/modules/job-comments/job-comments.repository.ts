import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class JobCommentsRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set([
    'fs_scheduler_id',
    'comment',
    'created_date',
    'name',
    'user_id',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_job_comments', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getByFsId(fsId: number): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      'SELECT * FROM eyefidb.fs_job_comments WHERE fs_scheduler_id = ? ORDER BY id DESC',
      [fsId],
    );
  }
}

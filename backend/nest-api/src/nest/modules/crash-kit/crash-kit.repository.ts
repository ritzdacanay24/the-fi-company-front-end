import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class CrashKitRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set([
    'part_number',
    'qty',
    'price',
    'work_order_id',
    'description',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_crash_kit', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getByWorkOrderId(workOrderId: number): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      'SELECT * FROM eyefidb.fs_crash_kit WHERE work_order_id = ? ORDER BY id DESC',
      [workOrderId],
    );
  }
}

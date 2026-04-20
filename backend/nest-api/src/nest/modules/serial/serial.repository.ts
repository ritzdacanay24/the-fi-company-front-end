import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class SerialRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set(['workOrderId', 'type', 'customerAsset', 'eyefiAsset']);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_workOrderMisc', mysqlService);
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
      'SELECT * FROM eyefidb.fs_workOrderMisc WHERE workOrderId = ? ORDER BY id DESC',
      [workOrderId],
    );
  }
}

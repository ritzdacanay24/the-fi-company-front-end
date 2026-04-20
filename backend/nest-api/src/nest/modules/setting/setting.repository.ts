import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class SettingRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set([
    'type',
    'value',
    'background_color',
    'text_color',
    'active',
    'etc',
    'image',
    'description',
    'default',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_settings', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }
}

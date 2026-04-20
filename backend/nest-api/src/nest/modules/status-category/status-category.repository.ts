import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

export interface StatusCategoryRecord extends RowDataPacket {
  id: number;
  title: string | null;
  active: number | null;
}

@Injectable()
export class StatusCategoryRepository extends BaseRepository<StatusCategoryRecord> {
  private readonly allowedColumns = new Set([
    'name',
    'font_color',
    'background_color',
    'description',
    'active',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_status_category', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

export interface CalendarEventRecord extends RowDataPacket {
  id: number;
  title: string | null;
  description: string | null;
  start_date: Date | null;
  end_date: Date | null;
  all_day: number | null;
  background_color: string | null;
  text_color: string | null;
  recurring: string | null;
  resource: string | null;
  type_of_event: string | null;
  fs_scheduler_id: number | null;
  group_id: string | null;
  connecting: number | null;
  active: number | null;
  resource_code: string | null;
  resource_contractor: string | null;
  automate: string | null;
}

const ALLOWED_COLUMNS = new Set([
  'title',
  'description',
  'start_date',
  'end_date',
  'all_day',
  'background_color',
  'text_color',
  'recurring',
  'resource',
  'type_of_event',
  'fs_scheduler_id',
  'group_id',
  'connecting',
  'active',
  'resource_code',
  'resource_contractor',
  'automate',
]);

@Injectable()
export class CalendarEventRepository extends BaseRepository<CalendarEventRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_calendar', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => ALLOWED_COLUMNS.has(key) && value !== undefined,
      ),
    );
  }

  async getAll(): Promise<CalendarEventRecord[]> {
    return this.find();
  }
}

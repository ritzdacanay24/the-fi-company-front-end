import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

export interface TicketEventRecord extends RowDataPacket {
  id: number;
  event_name: string | null;
  description: string | null;
  isEvent: number | null;
  isTravel: number | null;
  event_type: number | null;
  isBreak: number | null;
  active: number | null;
  icon: string | null;
  background_color: string | null;
}

const ALLOWED_COLUMNS = new Set([
  'event_name',
  'description',
  'isEvent',
  'isTravel',
  'event_type',
  'isBreak',
  'active',
  'icon',
  'background_color',
]);

@Injectable()
export class TicketEventRepository extends BaseRepository<TicketEventRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_event_type', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => ALLOWED_COLUMNS.has(key) && value !== undefined,
      ),
    );
  }

  async getActive(): Promise<TicketEventRecord[]> {
    return this.rawQuery<TicketEventRecord>(
      `SELECT * FROM eyefidb.fs_event_type WHERE active = 1 ORDER BY event_name ASC`,
    );
  }

  async getInactive(): Promise<TicketEventRecord[]> {
    return this.rawQuery<TicketEventRecord>(
      `SELECT * FROM eyefidb.fs_event_type WHERE active = 0 OR active IS NULL ORDER BY event_name ASC`,
    );
  }

  async getAll(): Promise<TicketEventRecord[]> {
    return this.find();
  }
}

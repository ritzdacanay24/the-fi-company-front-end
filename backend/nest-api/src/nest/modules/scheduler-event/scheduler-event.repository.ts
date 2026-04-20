import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

export interface SchedulerEventRecord extends RowDataPacket {
  id: number;
  start: Date | null;
  title: string | null;
  end: string | null;
  description: string | null;
  allDay: string | null;
  backgroundColor: string | null;
  borderColor: string | null;
  textColor: string | null;
  groupId: string | null;
  daysOfWeek: string | null;
  freq: string | null;
  recur: string | null;
  intvl: number | null;
  duration: string | null;
  until: Date | null;
  count: number | null;
  type: string | null;
  techRelated: string | null;
  fs_det_id: number | null;
}

@Injectable()
export class SchedulerEventRepository extends BaseRepository<SchedulerEventRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.companyHoliday', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    // Legacy PHP used dynamic insert/update against companyHoliday,
    // so keep all defined keys instead of a narrow whitelist.
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
  }

  async getAll(): Promise<SchedulerEventRecord[]> {
    return this.find();
  }

  async getAllRequests(dateFrom: string, dateTo: string): Promise<SchedulerEventRecord[]> {
    return this.rawQuery<SchedulerEventRecord>(
      `SELECT * FROM eyefidb.companyHoliday 
       WHERE DATE(start) BETWEEN ? AND ? 
       ORDER BY start DESC`,
      [dateFrom, dateTo],
    );
  }
}

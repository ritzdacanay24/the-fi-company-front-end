import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

export interface EventRecord extends RowDataPacket {
  id: number;
  workOrderId: number | null;
  proj_type: string | null;
  event_id: number | null;
  description: string | null;
  projectStart: Date | null;
  projectFinish: Date | null;
  totalHours: number | null;
  createdDate: Date | null;
  userId: number | null;
  active: number | null;
  seq: number | null;
  brStart: Date | null;
  brEnd: Date | null;
  flight_hrs_delay: string | null;
  projectStartTz: string | null;
  projectFinishTz: string | null;
  include_calculation: number | null;
  include_traveling: number | null;
  include_install: number | null;
  projectStartCoordinates: string | null;
  projectFinishCoordinates: string | null;
  copiedFromTicketId: number | null;
}

export interface EventViewRecord extends RowDataPacket {
  id: number;
  workOrderId: number | null;
  userId: number | null;
  projectStart: Date | null;
  username: string | null;
}

const ALLOWED_COLUMNS = new Set([
  'workOrderId',
  'proj_type',
  'event_id',
  'description',
  'projectStart',
  'projectFinish',
  'totalHours',
  'userId',
  'active',
  'seq',
  'brStart',
  'brEnd',
  'flight_hrs_delay',
  'projectStartTz',
  'projectFinishTz',
  'include_calculation',
  'include_traveling',
  'include_install',
  'projectStartCoordinates',
  'projectFinishCoordinates',
  'copiedFromTicketId',
]);

@Injectable()
export class EventRepository extends BaseRepository<EventRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_workOrderProject', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => ALLOWED_COLUMNS.has(key) && value !== undefined,
      ),
    );
  }

  async getAll(): Promise<EventRecord[]> {
    return this.find();
  }

  async getEventViewByWorkOrderId(workOrderId: number): Promise<EventViewRecord[]> {
    return this.rawQuery<EventViewRecord>(
      `
        SELECT a.*, CONCAT(b.first, ' ', b.last) AS username
        FROM fs_labor_view a
        LEFT JOIN db.users b ON b.id = a.userId
        WHERE a.workOrderId = ?
        ORDER BY projectStart ASC, id ASC
      `,
      [workOrderId],
    );
  }
}

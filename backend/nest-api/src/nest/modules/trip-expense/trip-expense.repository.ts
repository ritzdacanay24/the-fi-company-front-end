import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export interface TripExpenseRecord extends RowDataPacket {
  id: number;
  workOrderId: number | null;
  fs_scheduler_id: number | null;
  fileName: string | null;
  link: string | null;
  created_by_name: string | null;
}

@Injectable()
export class TripExpenseRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getByWorkOrderId(workOrderId: number): Promise<TripExpenseRecord[]> {
    return this.mysqlService.query<TripExpenseRecord[]>(
      `
        SELECT a.*, CONCAT('https://dashboard.eye-fi.com/attachments/fieldService/', a.fileName) AS link,
               CONCAT(b.first, ' ', b.last) AS created_by_name
        FROM fs_workOrderTrip a
        LEFT JOIN db.users b ON b.id = a.created_by
        WHERE a.workOrderId = ?
        ORDER BY a.date ASC, a.time ASC
      `,
      [workOrderId],
    );
  }

  async getByFsId(fsSchedulerId: number): Promise<TripExpenseRecord[]> {
    return this.mysqlService.query<TripExpenseRecord[]>(
      `
        SELECT a.*, CONCAT('https://dashboard.eye-fi.com/attachments/fieldService/', a.fileName) AS link,
               CONCAT(b.first, ' ', b.last) AS created_by_name,
               c.fs_scheduler_id
        FROM fs_workOrderTrip a
        LEFT JOIN db.users b ON b.id = a.created_by
        LEFT JOIN fs_workOrder c ON c.id = a.workOrderId
        WHERE c.fs_scheduler_id = ? OR a.fs_scheduler_id = ?
      `,
      [fsSchedulerId, fsSchedulerId],
    );
  }
}

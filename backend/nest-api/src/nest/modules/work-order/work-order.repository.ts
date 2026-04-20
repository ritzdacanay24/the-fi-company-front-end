import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { PoolConnection } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

export interface WorkOrderRecord extends RowDataPacket {
  id: number;
  fs_scheduler_id: number | null;
  customerName1: string | null;
  type: string | null;
  type1: string | null;
  type2: string | null;
  type4: string | null;
  signature: string | null;
  phone: string | null;
  survey: string | null;
  email: string | null;
  workCompleted: string | null;
  workCompletedComment: string | null;
  sendResults: string | null;
  techSignature: string | null;
  dateSigned: string | null;
  createdDate: string | null;
  userId: number | null;
  active: number | null;
  submitted: number | null;
  dateSubmitted: string | null;
  techName: string | null;
  comments: string | null;
  accept: string | null;
  workCompletedDate: string | null;
  flightDelayed: string | null;
  hrsDelayed: number | null;
  technicianSignatureName: string | null;
  repairComment: string | null;
  partReceivedByName: string | null;
  partLocation: string | null;
  review_completed_date: string | null;
  review_status: string | null;
  review_link: string | null;
  review_approved_denied: string | null;
  review_comments: string | null;
  review_billing_comments: string | null;
}

@Injectable()
export class WorkOrderRepository extends BaseRepository<WorkOrderRecord> {
  private readonly allowedColumns = new Set([
    'fs_scheduler_id',
    'customerName1',
    'type',
    'type1',
    'type2',
    'type4',
    'signature',
    'phone',
    'survey',
    'email',
    'workCompleted',
    'workCompletedComment',
    'sendResults',
    'techSignature',
    'dateSigned',
    'createdDate',
    'userId',
    'active',
    'submitted',
    'dateSubmitted',
    'techName',
    'comments',
    'accept',
    'workCompletedDate',
    'flightDelayed',
    'hrsDelayed',
    'customerSignatureImage',
    'technicianSignatureImage',
    'technicianSignatureName',
    'repairComment',
    'partReceivedByName',
    'partReceivedBySignature',
    'partLocation',
    'review_completed_date',
    'review_status',
    'review_link',
    'review_approved_denied',
    'review_comments',
    'review_billing_comments',
  ]);

  constructor(@Inject(MysqlService) private readonly mysqlServiceRef: MysqlService) {
    super('eyefidb.fs_workOrder', mysqlServiceRef);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getAll(
    selectedViewType?: string,
    dateFrom?: string,
    dateTo?: string,
    isAll = false,
  ): Promise<RowDataPacket[]> {
    const params: (string | number)[] = [];
    let sql = `
      SELECT a.*,
             b.id AS fs_scheduler_id,
             b.request_date,
             b.status
      FROM eyefidb.fs_workOrder a
      INNER JOIN eyefidb.fs_scheduler b ON b.id = a.fs_scheduler_id AND b.active = 1
      WHERE a.id != 0
    `;

    if (!isAll && dateFrom && dateTo) {
      sql += ' AND b.request_date BETWEEN ? AND ?';
      params.push(dateFrom, dateTo);
    }

    if (selectedViewType === 'Open') {
      sql += ' AND a.active = 1 AND a.dateSubmitted IS NULL';
    } else if (selectedViewType === 'Closed') {
      sql += ' AND a.active = 1 AND a.dateSubmitted IS NOT NULL';
    }

    sql += ' ORDER BY b.request_date DESC';
    return this.rawQuery<RowDataPacket>(sql, params);
  }

  async getByWorkOrderId(workOrderId: number): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      'SELECT * FROM eyefidb.fs_workOrder WHERE id = ?',
      [workOrderId],
    );
  }

  async deleteWithRelations(id: number): Promise<number> {
    return this.mysqlServiceRef.withTransaction(async (connection: PoolConnection) => {
      await connection.execute<ResultSetHeader>(
        'DELETE FROM eyefidb.fs_workOrder WHERE id = ?',
        [id],
      );

      await connection.execute<ResultSetHeader>(
        'DELETE FROM eyefidb.fs_workOrderProject WHERE workOrderId = ?',
        [id],
      );

      await connection.execute<ResultSetHeader>(
        'DELETE FROM eyefidb.fs_assets WHERE workOrderId = ?',
        [id],
      );

      const [tripDelete] = await connection.execute<ResultSetHeader>(
        'DELETE FROM eyefidb.fs_workOrderTrip WHERE workOrderId = ?',
        [id],
      );

      return tripDelete.affectedRows;
    });
  }
}

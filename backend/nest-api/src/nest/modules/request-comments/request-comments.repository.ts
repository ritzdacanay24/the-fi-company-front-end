import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

export interface RequestCommentRow extends RowDataPacket {
  id: number;
  fs_request_id: number;
  comment: string;
  created_date: string;
  name: string;
  cc_email: string | null;
  email: string | null;
  subject: string | null;
  request_change: number | null;
  request_change_completed: string | null;
}

export interface RequestEmailContextRow extends RowDataPacket {
  id: number;
  subject: string | null;
  token: string | null;
  email: string | null;
  cc_email: string | null;
  date_of_service: string | null;
  start_time: string | null;
  customer_co_number: string | null;
  so_number: string | null;
  property: string | null;
  state: string | null;
  city: string | null;
}

@Injectable()
export class RequestCommentsRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set([
    'fs_request_id',
    'comment',
    'created_date',
    'name',
    'cc_email',
    'email',
    'subject',
    'request_change',
    'request_change_completed',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_comments', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getByRequestId(fsRequestId: number): Promise<RequestCommentRow[]> {
    return this.rawQuery<RequestCommentRow>(
      `
        SELECT *
        FROM eyefidb.fs_comments
        WHERE fs_request_id = ?
        ORDER BY id DESC
      `,
      [fsRequestId],
    );
  }

  async getRequestEmailContext(fsRequestId: number): Promise<RequestEmailContextRow | null> {
    const rows = await this.rawQuery<RequestEmailContextRow>(
      `
        SELECT id,
               subject,
               token,
           email,
           cc_email,
               date_of_service,
               start_time,
               customer_co_number,
               so_number,
               property,
               state,
               city
        FROM eyefidb.fs_request
        WHERE id = ?
        LIMIT 1
      `,
      [fsRequestId],
    );

    return rows[0] ?? null;
  }
}

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
}

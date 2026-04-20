import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class AttachmentsRepository extends BaseRepository<RowDataPacket> {
  private static readonly ALLOWED_FILTER_COLUMNS = new Set<string>([
    'id',
    'fileName',
    'link',
    'createdBy',
    'createdDate',
    'field',
    'capaRequestId',
    'uniqueId',
    'mainId',
    'fileSize',
    'fileSizeConv',
    'ext',
    'active',
    'partNumber',
    'width',
    'height',
    'tripExpenseId',
    'title',
    'description',
    'directory',
    'date_of_service',
    'type_of_work_completed',
  ]);

  private static readonly ALLOWED_CREATE_COLUMNS = new Set<string>([
    'fileName',
    'link',
    'createdBy',
    'createdDate',
    'field',
    'capaRequestId',
    'uniqueId',
    'mainId',
    'fileSize',
    'fileSizeConv',
    'ext',
    'active',
    'partNumber',
    'width',
    'height',
    'tripExpenseId',
    'title',
    'description',
    'directory',
    'date_of_service',
    'type_of_work_completed',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('attachments', mysqlService);
  }

  async find(filters: Record<string, string>): Promise<RowDataPacket[]> {
    const params: unknown[] = [];

    let sql = `
      SELECT *
      FROM attachments
      WHERE 1 = 1
    `;

    for (const [key, value] of Object.entries(filters)) {
      if (!AttachmentsRepository.ALLOWED_FILTER_COLUMNS.has(key)) {
        continue;
      }

      sql += ` AND \`${key}\` = ?`;
      params.push(value);
    }

    sql += ` ORDER BY CASE WHEN date_of_service IS NOT NULL THEN date_of_service ELSE id END DESC`;

    return this.rawQuery<RowDataPacket>(sql, params);
  }

  async deleteById(id: number): Promise<number> {
    return super.deleteById(id);
  }

  async createAttachment(payload: Record<string, unknown>): Promise<number> {
    const sanitized = Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) =>
          AttachmentsRepository.ALLOWED_CREATE_COLUMNS.has(key) &&
          value !== undefined &&
          value !== null &&
          value !== '',
      ),
    );

    const keys = Object.keys(sanitized);
    const values = Object.values(sanitized);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO attachments (${keys.join(', ')}) VALUES (${placeholders})`;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, values);
    return result.insertId;
  }

  async updateAttachment(id: number, payload: Record<string, unknown>): Promise<number> {
    const sanitized = Object.fromEntries(
      Object.entries(payload)
        .filter(([key]) => AttachmentsRepository.ALLOWED_CREATE_COLUMNS.has(key))
        .map(([key, value]) => [key, value === '' ? null : value]),
    );

    const keys = Object.keys(sanitized);
    if (!keys.length) {
      return 0;
    }

    const values = Object.values(sanitized);
    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const sql = `UPDATE attachments SET ${setClause} WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [...values, id]);
    return result.affectedRows;
  }

  async getByWorkOrderId(workOrderId: number): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT *
       FROM attachments
       WHERE uniqueId = ?
         AND field = 'Field Service'`,
      [workOrderId],
    );
  }

  async getAllRelatedAttachments(id: number): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT a.request_id, a.id, b.*
       FROM eyefidb.fs_scheduler a
       JOIN eyefidb.attachments b ON b.uniqueId = a.request_id AND FIELD IN ('Field Service Request')
       WHERE a.id = ?
       UNION ALL
       SELECT a.request_id, a.id, b.*
       FROM eyefidb.fs_scheduler a
       JOIN eyefidb.attachments b ON b.uniqueId = a.id AND FIELD IN ('Field Service Scheduler')
       WHERE a.id = ?
       UNION ALL
       SELECT a.request_id, a.id, b.*
       FROM eyefidb.fs_scheduler a
       JOIN eyefidb.attachments b ON b.uniqueId = a.id AND FIELD IN ('Field Service Receipts')
       WHERE a.id = ?`,
      [id, id, id],
    );
  }
}

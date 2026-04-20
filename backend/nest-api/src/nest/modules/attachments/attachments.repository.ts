import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
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

  async getAllRelatedAttachments(id: number): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT a.request_id, a.id, b.*, CONCAT('https://dashboard.eye-fi.com/attachments/fieldService/', fileName) AS link
       FROM eyefidb.fs_scheduler a
       JOIN eyefidb.attachments b ON b.uniqueId = a.request_id AND FIELD IN ('Field Service Request')
       WHERE a.id = ?
       UNION ALL
       SELECT a.request_id, a.id, b.*, CONCAT('https://dashboard.eye-fi.com/attachments/fieldService/', fileName) AS link
       FROM eyefidb.fs_scheduler a
       JOIN eyefidb.attachments b ON b.uniqueId = a.id AND FIELD IN ('Field Service Scheduler')
       WHERE a.id = ?
       UNION ALL
       SELECT a.request_id, a.id, b.*, CONCAT('https://dashboard.eye-fi.com/attachments/fieldService/', fileName) AS link
       FROM eyefidb.fs_scheduler a
       JOIN eyefidb.attachments b ON b.uniqueId = a.id AND FIELD IN ('Field Service Receipts')
       WHERE a.id = ?`,
      [id, id, id],
    );
  }
}

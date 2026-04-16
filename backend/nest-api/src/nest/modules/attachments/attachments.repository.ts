import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class AttachmentsRepository {
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

  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

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

    return this.mysqlService.query<RowDataPacket[]>(sql, params);
  }

  async deleteById(id: number): Promise<number> {
    const sql = `DELETE FROM attachments WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [id]);
    return result.affectedRows;
  }
}

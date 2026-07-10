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
    'storage_source',
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
    'storage_source',
    'storage_bucket',
    'storage_key',
    'date_of_service',
    'type_of_work_completed',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('attachments', mysqlService);
  }

  async find(filters: Record<string, string>): Promise<RowDataPacket[]> {
    const params: unknown[] = [];

    let sql = `
      SELECT
        a.*,
        NULLIF(TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, ''))), '') as created_by_name,
        NULLIF(TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, ''))), '') as user_name
      FROM attachments a
      LEFT JOIN db.users u ON a.createdBy = u.id
      WHERE 1 = 1
    `;

    for (const [key, value] of Object.entries(filters)) {
      if (!AttachmentsRepository.ALLOWED_FILTER_COLUMNS.has(key)) {
        continue;
      }

      sql += ` AND a.\`${key}\` = ?`;
      params.push(value);
    }

    sql += ` ORDER BY CASE WHEN a.date_of_service IS NOT NULL THEN a.date_of_service ELSE a.id END DESC`;

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

  async getById(id: number): Promise<RowDataPacket | null> {
    const results = await this.rawQuery<RowDataPacket>(
      `SELECT * FROM attachments WHERE id = ?`,
      [id],
    );
    return results.length > 0 ? results[0] : null;
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

  /**
   * Get attachments for a specific field and ID (reusable for all components)
   * Supports legacy field names for backward compatibility
   * 
   * @param fields - Field name(s) to search for. Can be a single string or array for legacy compatibility.
   *                 If array provided, queries: WHERE field IN (fields) AND mainId = ?
   * @param mainId - The main resource ID
   * 
   * @example
   * // Search current field only
   * getByFieldAndId('parts_order', orderId)
   * 
   * // Search current AND legacy fields
   * getByFieldAndId(['parts_order', 'FS Parts Order'], orderId)
   */
  async getByFieldAndId(
    fields: string | string[],
    mainId: number,
  ): Promise<(RowDataPacket & { link?: string; bucket?: string })[]> {
    const fieldArray = Array.isArray(fields) ? fields : [fields];

    // Build placeholders for IN clause: (?, ?, ?)
    const placeholders = fieldArray.map(() => '?').join(',');

    return this.rawQuery<RowDataPacket & { link?: string; bucket?: string }>(
      `
        SELECT 
          a.id,
          a.fileName as file_name,
          a.link,
          a.storage_bucket as bucket,
          a.storage_key,
          a.storage_source,
          a.ext as mime_type,
          a.fileSize as file_size,
          a.createdBy as uploaded_by,
          a.createdDate as created_at,
          CONCAT(u.first, ' ', u.last) as created_by_name
        FROM attachments a
        LEFT JOIN db.users u ON a.createdBy = u.id
        WHERE a.field IN (${placeholders}) AND a.mainId = ?
        ORDER BY a.createdDate DESC
      `,
      [...fieldArray, mainId],
    );
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

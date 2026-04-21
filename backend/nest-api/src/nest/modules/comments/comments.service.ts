import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { CommentsRepository } from './comments.repository';
import { MysqlService } from '@/shared/database/mysql.service';

type GenericRow = Record<string, unknown>;

@Injectable()
export class CommentsService {
  constructor(
    private readonly repository: CommentsRepository,
    private readonly mysqlService: MysqlService,
  ) {}

  async find(orderNum?: string, type?: string, active?: string) {
    const normalizedOrderNum = String(orderNum || '').trim();
    const normalizedType = String(type || '').trim();
    const normalizedActive = Number(active ?? 1);

    return this.repository.find({
      orderNum: normalizedOrderNum || undefined,
      type: normalizedType || undefined,
      active: Number.isNaN(normalizedActive) ? 1 : normalizedActive,
    });
  }

  async create(payload: {
    comments?: string;
    orderNum?: string;
    userId?: number | string;
    type?: string;
    locationPath?: string;
    pageName?: string;
    comments_html?: string;
    pid?: string | number | null;
  }) {
    const comments = String(payload?.comments || '').trim();
    const orderNum = String(payload?.orderNum || '').trim();
    const type = String(payload?.type || '').trim();
    const userId = Number(payload?.userId);

    if (!comments || !orderNum || !type || !userId) {
      return { success: false, message: 'comments, orderNum, type and userId are required' };
    }

    const insertId = await this.repository.create({
      comments,
      orderNum,
      userId,
      type,
      pageApplied: String(payload?.locationPath || ''),
      pageName: String(payload?.pageName || ''),
      commentsHtml: String(payload?.comments_html || ''),
      pid: payload?.pid === null || payload?.pid === undefined ? null : String(payload.pid),
    });

    return { success: true, insertId };
  }

  async delete(payload: { id?: number | string; active?: number | string }) {
    const id = Number(payload?.id);
    if (!id) {
      return { success: false, message: 'Comment id is required' };
    }

    const active = Number(payload?.active ?? 0);
    await this.repository.softDelete(id, Number.isNaN(active) ? 0 : active);

    return { success: true, id, active: Number.isNaN(active) ? 0 : active };
  }

  /**
   * Get formatted comments for shipping report by order numbers
   */
  async getForShippingByOrderNumbers(ids: string[]): Promise<GenericRow[]> {
    if (!ids.length) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(', ');
    const sql = `
      SELECT a.orderNum
        , comments_html
        , comments
        , a.createdDate
        , DATE(a.createdDate) byDate
        , CASE WHEN DATE(a.createdDate) = CURDATE() THEN 'text-success' ELSE 'text-info' END color_class_name
        , CASE WHEN DATE(a.createdDate) = CURDATE() THEN 'bg-success' ELSE 'bg-info' END bg_class_name
        , CONCAT('SO#:', ' ', a.orderNum) comment_title
        , CONCAT(c.first, ' ', c.last) created_by_name
      FROM eyefidb.comments a
      INNER JOIN (
        SELECT orderNum
          , MAX(id) id
          , MAX(DATE(createdDate)) createdDate
        FROM eyefidb.comments
        WHERE orderNum IN (${placeholders})
          AND active = 1
        GROUP BY orderNum
      ) b ON a.orderNum = b.orderNum AND a.id = b.id
      LEFT JOIN db.users c ON c.id = a.userId
      WHERE a.type = 'Sales Order'
        AND a.orderNum IN (${placeholders})
        AND a.active = 1
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [...ids, ...ids]);
  }

  /**
   * Get mention comments by order numbers
   */
  async getMentionsByOrderNumbers(ids: string[]): Promise<GenericRow[]> {
    if (!ids.length) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(', ');
    const sql = `
      SELECT GROUP_CONCAT(comments) all_comments
        , orderNum
      FROM eyefidb.comments
      WHERE orderNum IN (${placeholders})
        AND active = 1
      GROUP BY orderNum
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, ids);
  }
}

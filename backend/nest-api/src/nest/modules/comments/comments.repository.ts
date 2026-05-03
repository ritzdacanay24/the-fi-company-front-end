import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface CommentOwnerRow extends RowDataPacket {
  id: number;
  userId: number;
  active: number;
}

@Injectable()
export class CommentsRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async find(params: { orderNum?: string; type?: string; active?: number }): Promise<RowDataPacket[]> {
    const where: string[] = [];
    const values: unknown[] = [];

    if (params.orderNum) {
      where.push('a.orderNum = ?');
      values.push(params.orderNum);
    }

    if (params.type) {
      where.push('a.type = ?');
      values.push(params.type);
    }

    if (typeof params.active === 'number' && !Number.isNaN(params.active)) {
      where.push('a.active = ?');
      values.push(params.active);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
      SELECT a.*
        , CONCAT(b.first, ' ', b.last) AS userName
        , b.image
      FROM eyefidb.comments a
      LEFT JOIN db.users b ON b.id = a.userId
      ${whereClause}
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, values);
  }

  async create(payload: {
    comments: string;
    orderNum: string;
    userId: number;
    type: string;
    pageApplied: string;
    pageName: string;
    commentsHtml: string;
    pid: string | null;
  }): Promise<number> {
    const sql = `
      INSERT INTO eyefidb.comments(
        comments
        , createdDate
        , orderNum
        , userId
        , type
        , pageApplied
        , pageName
        , comments_html
        , pid
      )
      VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      payload.comments,
      payload.orderNum,
      payload.userId,
      payload.type,
      payload.pageApplied,
      payload.pageName,
      payload.commentsHtml,
      payload.pid,
    ]);

    return result.insertId;
  }

  async softDelete(id: number, active: number): Promise<void> {
    const sql = `
      UPDATE eyefidb.comments
      SET active = ?
      WHERE id = ?
      LIMIT 1
    `;

    await this.mysqlService.execute(sql, [active, id]);
  }

  async findOwnerById(id: number): Promise<CommentOwnerRow | null> {
    const rows = await this.mysqlService.query<CommentOwnerRow[]>(
      `SELECT id, userId, active FROM eyefidb.comments WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }
}

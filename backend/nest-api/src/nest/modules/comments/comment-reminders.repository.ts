import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface ReminderRow extends RowDataPacket {
  id: number;
  comment_id: number;
  user_id: number;
  remind_at: string;
  note: string | null;
  sent_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

@Injectable()
export class CommentRemindersRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async upsert(params: {
    commentId: number;
    userId: number;
    remindAt: string;
    note?: string | null;
  }): Promise<number> {
    // Cancel any existing pending reminder for this user+comment first.
    await this.mysqlService.execute(
      `UPDATE eyefidb.comment_reminders
         SET cancelled_at = UTC_TIMESTAMP()
       WHERE comment_id = ? AND user_id = ? AND sent_at IS NULL AND cancelled_at IS NULL`,
      [params.commentId, params.userId],
    );

    const result = await this.mysqlService.execute<ResultSetHeader>(
      `INSERT INTO eyefidb.comment_reminders
         (comment_id, user_id, remind_at, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [params.commentId, params.userId, params.remindAt, params.note ?? null],
    );

    return result.insertId;
  }

  async cancel(commentId: number, userId: number): Promise<void> {
    await this.mysqlService.execute(
      `UPDATE eyefidb.comment_reminders
         SET cancelled_at = UTC_TIMESTAMP()
       WHERE comment_id = ? AND user_id = ? AND sent_at IS NULL AND cancelled_at IS NULL`,
      [commentId, userId],
    );
  }

  async findActiveForUser(commentId: number, userId: number): Promise<ReminderRow | null> {
    const rows = await this.mysqlService.query<ReminderRow[]>(
      `SELECT * FROM eyefidb.comment_reminders
       WHERE comment_id = ? AND user_id = ? AND sent_at IS NULL AND cancelled_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      [commentId, userId],
    );
    return rows[0] ?? null;
  }

  async findActiveForComments(commentIds: number[], userId: number): Promise<ReminderRow[]> {
    if (!commentIds.length) return [];
    const placeholders = commentIds.map(() => '?').join(',');
    return this.mysqlService.query<ReminderRow[]>(
      `SELECT * FROM eyefidb.comment_reminders
       WHERE comment_id IN (${placeholders})
         AND user_id = ?
         AND sent_at IS NULL
         AND cancelled_at IS NULL`,
      [...commentIds, userId],
    );
  }

  /** Returns due reminders not yet sent, joined with comment + user email. */
  async findDueReminders(): Promise<RowDataPacket[]> {
    return this.mysqlService.query<RowDataPacket[]>(`
      SELECT
        r.id             AS reminder_id,
        r.comment_id,
        r.user_id,
        r.remind_at,
        r.note,
        u.email          AS user_email,
        CONCAT(u.first, ' ', u.last) AS user_name,
        c.comments,
        c.orderNum       AS order_num,
        c.type           AS comment_type,
        c.pageApplied    AS location_path
      FROM eyefidb.comment_reminders r
      LEFT JOIN eyefidb.comments c ON c.id = r.comment_id
      JOIN db.users u ON u.id = r.user_id
      WHERE r.remind_at <= UTC_TIMESTAMP()
        AND r.sent_at IS NULL
        AND r.cancelled_at IS NULL
        AND u.active = 1
        AND u.email IS NOT NULL
    `);
  }

  async markSent(id: number): Promise<void> {
    await this.mysqlService.execute(
      `UPDATE eyefidb.comment_reminders SET sent_at = UTC_TIMESTAMP() WHERE id = ?`,
      [id],
    );
  }
}

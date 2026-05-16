import { Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export type ScheduledJobRecipientType = 'internal_user' | 'external_email';
export type ScheduledJobNotificationScope = 'always' | 'on_failure';

export interface ScheduledJobRecipientRecord extends RowDataPacket {
  id: number;
  job_id: string;
  recipient_type: ScheduledJobRecipientType;
  user_id: number | null;
  email: string | null;
  display_name: string | null;
  is_subscribed: number;
  is_assignee: number;
  notification_scope: ScheduledJobNotificationScope;
  active: number;
  resolved_email: string | null;
  resolved_name: string | null;
  resolved_user_active: number | null;
}

export interface UpsertScheduledJobRecipientInput {
  recipientType: ScheduledJobRecipientType;
  userId?: number | null;
  email?: string | null;
  displayName?: string | null;
  isSubscribed: boolean;
  isAssignee: boolean;
  notificationScope: ScheduledJobNotificationScope;
  active: boolean;
}

@Injectable()
export class ScheduledJobRecipientsRepository {
  constructor(private readonly mysqlService: MysqlService) {}

  async listByJobId(jobId: string): Promise<ScheduledJobRecipientRecord[]> {
    return this.mysqlService.query<ScheduledJobRecipientRecord[]>(
      `SELECT
        r.id,
        r.job_id,
        r.recipient_type,
        r.user_id,
        r.email,
        r.display_name,
        r.is_subscribed,
        r.is_assignee,
        r.notification_scope,
        r.active,
        COALESCE(u.email, r.email) AS resolved_email,
        NULLIF(TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, ''))), '') AS resolved_name,
        u.active AS resolved_user_active
      FROM scheduled_job_recipients r
      LEFT JOIN db.users u ON u.id = r.user_id
      WHERE r.job_id = ?
      ORDER BY r.is_assignee DESC, r.is_subscribed DESC, r.id ASC`,
      [jobId],
    );
  }

  async replaceByJobId(jobId: string, recipients: UpsertScheduledJobRecipientInput[]): Promise<void> {
    await this.mysqlService.withTransaction(async (connection) => {
      await connection.execute('DELETE FROM scheduled_job_recipients WHERE job_id = ?', [jobId]);

      if (!recipients.length) {
        return;
      }

      const insertSql = `INSERT INTO scheduled_job_recipients (
        job_id,
        recipient_type,
        user_id,
        email,
        display_name,
        is_subscribed,
        is_assignee,
        notification_scope,
        active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      for (const recipient of recipients) {
        await connection.execute<ResultSetHeader>(insertSql, [
          jobId,
          recipient.recipientType,
          recipient.userId ?? null,
          recipient.email ?? null,
          recipient.displayName ?? null,
          recipient.isSubscribed ? 1 : 0,
          recipient.isAssignee ? 1 : 0,
          recipient.notificationScope,
          recipient.active ? 1 : 0,
        ]);
      }
    });
  }

  async unsubscribeByJobAndEmail(jobId: string, email: string): Promise<number> {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) {
      return 0;
    }

    const result = await this.mysqlService.execute<ResultSetHeader>(
      `UPDATE scheduled_job_recipients r
       LEFT JOIN db.users u ON u.id = r.user_id
       SET r.is_subscribed = 0,
           r.updated_at = NOW()
       WHERE r.job_id = ?
         AND r.active = 1
         AND r.is_subscribed = 1
         AND (
           (r.recipient_type = 'external_email' AND LOWER(TRIM(COALESCE(r.email, ''))) = ?)
           OR
           (r.recipient_type = 'internal_user' AND LOWER(TRIM(COALESCE(u.email, ''))) = ?)
         )`,
      [jobId, normalized, normalized],
    );

    return Number(result?.affectedRows ?? 0);
  }
}

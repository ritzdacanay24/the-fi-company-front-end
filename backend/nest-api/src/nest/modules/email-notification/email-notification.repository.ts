import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

export interface EmailNotificationRecord extends RowDataPacket {
  id: number;
  notification_emails: string | null;
  location: string | null;
  user_id: number | null;
}

export interface EmailNotificationOptionsRecord extends RowDataPacket {
  id: number;
  category: string | null;
  name: string | null;
  value: string | null;
}

const ALLOWED_COLUMNS = new Set(['notification_emails', 'location', 'user_id']);

@Injectable()
export class EmailNotificationRepository extends BaseRepository<EmailNotificationRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('safety_incident_config', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => ALLOWED_COLUMNS.has(key) && value !== undefined,
      ),
    );
  }

  async getList(): Promise<EmailNotificationRecord[]> {
    return this.rawQuery<EmailNotificationRecord>(
      `SELECT a.*, IFNULL(NULLIF(TRIM(b.email), ''), a.notification_emails) AS email,
              CASE
                WHEN a.user_id IS NOT NULL THEN NULLIF(TRIM(CONCAT(COALESCE(b.first, ''), ' ', COALESCE(b.last, ''))), '')
                ELSE NULL
              END AS display_name,
              CASE
                WHEN a.user_id IS NULL THEN 'Manual Email'
                WHEN b.active = 1 THEN 'Active'
                ELSE 'Inactive'
              END AS user_status
       FROM safety_incident_config a
       LEFT JOIN db.users b ON b.id = a.user_id
       WHERE a.user_id IS NULL OR (b.active = 1 AND IFNULL(b.access, 1) = 1)`,
    );
  }

  async findWithFilters(filters: Record<string, unknown>): Promise<EmailNotificationRecord[]> {
    let sql = `SELECT a.*, IFNULL(NULLIF(TRIM(b.email), ''), a.notification_emails) AS email,
                      CASE
                        WHEN a.user_id IS NOT NULL THEN NULLIF(TRIM(CONCAT(COALESCE(b.first, ''), ' ', COALESCE(b.last, ''))), '')
                        ELSE NULL
                      END AS display_name,
                      CASE
                        WHEN a.user_id IS NULL THEN 'Manual Email'
                        WHEN b.active = 1 THEN 'Active'
                        ELSE 'Inactive'
                      END AS user_status
               FROM safety_incident_config a
               LEFT JOIN db.users b ON b.id = a.user_id`;
    const params: unknown[] = [];
    const whereClauses: string[] = ['(a.user_id IS NULL OR (b.active = 1 AND IFNULL(b.access, 1) = 1))'];
    const keys = Object.keys(filters);
    if (keys.length > 0) {
      whereClauses.push(...keys.map((k) => `a.${k} = ?`));
      keys.forEach((k) => params.push(filters[k]));
    }
    sql += ` WHERE ${whereClauses.join(' AND ')}`;
    return this.rawQuery<EmailNotificationRecord>(sql, params);
  }

  async getNotificationOptions(): Promise<EmailNotificationOptionsRecord[]> {
    return this.rawQuery<EmailNotificationOptionsRecord>(
      'SELECT * FROM email_notification_access_options',
    );
  }
}

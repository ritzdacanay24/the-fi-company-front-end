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
      `SELECT a.*, b.email
       FROM safety_incident_config a
       LEFT JOIN db.users b ON b.id = a.user_id`,
    );
  }

  async findWithFilters(filters: Record<string, unknown>): Promise<EmailNotificationRecord[]> {
    let sql = `SELECT a.*, IFNULL(b.email, a.notification_emails) AS email
               FROM safety_incident_config a
               LEFT JOIN db.users b ON b.id = a.user_id`;
    const params: unknown[] = [];
    const keys = Object.keys(filters);
    if (keys.length > 0) {
      sql += ' WHERE ' + keys.map((k) => `a.${k} = ?`).join(' AND ');
      keys.forEach((k) => params.push(filters[k]));
    }
    return this.rawQuery<EmailNotificationRecord>(sql, params);
  }

  async getNotificationOptions(): Promise<EmailNotificationOptionsRecord[]> {
    return this.rawQuery<EmailNotificationOptionsRecord>(
      'SELECT * FROM email_notification_access_options',
    );
  }
}

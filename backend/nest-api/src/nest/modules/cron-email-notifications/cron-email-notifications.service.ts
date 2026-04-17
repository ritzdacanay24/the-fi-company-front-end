import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface CronEmailNotificationRow extends RowDataPacket {
  email: string;
}

@Injectable()
export class CronEmailNotificationsService {
  constructor(
    @Inject(MysqlService)
    private readonly mysqlService: MysqlService,
  ) {}

  async getRecipients(subscribedTo: string): Promise<string[]> {
    const key = (subscribedTo || '').trim();
    if (!key) {
      return [];
    }

    const rows = await this.mysqlService.query<CronEmailNotificationRow[]>(
      `
        SELECT DISTINCT email
        FROM cron_email_notifications
        WHERE subscribed_to = ?
          AND active = 1
          AND email IS NOT NULL
          AND TRIM(email) <> ''
      `,
      [key],
    );

    return this.extractUniqueEmails(rows.map((row) => row.email || ''));
  }

  private extractUniqueEmails(values: string[]): string[] {
    return values
      .flatMap((value) =>
        String(value || '')
          .split(/[;,]/)
          .map((email) => email.trim())
          .filter(Boolean),
      )
      .filter((email, index, list) => list.indexOf(email) === index);
  }
}

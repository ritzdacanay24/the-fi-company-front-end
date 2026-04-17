import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface IgtTransferEmailRecipientRow extends RowDataPacket {
  email: string | null;
}

@Injectable()
export class IgtTransferEmailRecipientsService {
  constructor(
    @Inject(MysqlService)
    private readonly mysqlService: MysqlService,
  ) {}

  async getRecipients(location: string): Promise<string[]> {
    const key = (location || '').trim();
    if (!key) {
      return [];
    }

    const rows = await this.mysqlService.query<IgtTransferEmailRecipientRow[]>(
      `
        SELECT IFNULL(b.email, a.notification_emails) AS email
        FROM safety_incident_config a
        LEFT JOIN db.users b ON b.id = a.user_id
        WHERE a.location = ?
      `,
      [key],
    );

    return rows
      .flatMap((row) =>
        String(row.email || '')
          .split(/[;,]/)
          .map((email) => email.trim())
          .filter(Boolean),
      )
      .filter((email, index, list) => list.indexOf(email) === index);
  }
}

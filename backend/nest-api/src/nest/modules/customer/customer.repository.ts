import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

export interface FsCompanyNotificationRecipientRow extends RowDataPacket {
  id: number;
  fs_company_id: number;
  email: string;
  is_active: number;
  created_date: string | null;
  updated_date: string | null;
}

export interface UpsertFsCompanyNotificationRecipientInput {
  email: string;
  isActive: boolean;
}

@Injectable()
export class CustomerRepository extends BaseRepository<RowDataPacket> {
  private readonly allowedColumns = new Set([
    'name',
    'image',
    'active',
    'background_color',
    'notification_emails',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.fs_company_det', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async listNotificationRecipients(customerId: number): Promise<FsCompanyNotificationRecipientRow[]> {
    return this.mysqlService.query<FsCompanyNotificationRecipientRow[]>(
      `SELECT
         id,
         fs_company_id,
         email,
         is_active,
         created_date,
         updated_date
       FROM eyefidb.fs_company_notification_recipients
       WHERE fs_company_id = ?
       ORDER BY is_active DESC, email ASC`,
      [customerId],
    );
  }

  async deleteNotificationRecipient(customerId: number, recipientId: number): Promise<number> {
    return this.mysqlService.withTransaction(async (connection) => {
      const [result] = await connection.execute<ResultSetHeader>(
        'DELETE FROM eyefidb.fs_company_notification_recipients WHERE fs_company_id = ? AND id = ?',
        [customerId, recipientId],
      );

      await this.syncNotificationEmails(customerId, connection);

      return result.affectedRows;
    });
  }

  async replaceNotificationRecipients(
    customerId: number,
    recipients: UpsertFsCompanyNotificationRecipientInput[],
  ): Promise<void> {
    await this.mysqlService.withTransaction(async (connection) => {
      await connection.execute(
        'DELETE FROM eyefidb.fs_company_notification_recipients WHERE fs_company_id = ?',
        [customerId],
      );

      if (recipients.length > 0) {
        const sql = `INSERT INTO eyefidb.fs_company_notification_recipients (
          fs_company_id,
          email,
          is_active,
          created_date,
          updated_date
        ) VALUES (?, ?, ?, NOW(), NOW())`;

        for (const recipient of recipients) {
          await connection.execute<ResultSetHeader>(sql, [
            customerId,
            recipient.email,
            recipient.isActive ? 1 : 0,
          ]);
        }
      }

      await this.syncNotificationEmails(customerId, connection);
    });
  }

  private async syncNotificationEmails(customerId: number, connection: {
    execute: (sql: string, values?: unknown[]) => Promise<unknown>;
  }): Promise<void> {
    await connection.execute(
      `UPDATE eyefidb.fs_company_det c
       LEFT JOIN (
         SELECT fs_company_id, GROUP_CONCAT(email ORDER BY email SEPARATOR ', ') AS emails
         FROM eyefidb.fs_company_notification_recipients
         WHERE is_active = 1
         GROUP BY fs_company_id
       ) r ON r.fs_company_id = c.id
       SET c.notification_emails = COALESCE(r.emails, NULL)
       WHERE c.id = ?`,
      [customerId],
    );
  }
}

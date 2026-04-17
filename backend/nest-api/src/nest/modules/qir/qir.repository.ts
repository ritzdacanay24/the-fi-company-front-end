import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

interface NotificationRecipientRow extends RowDataPacket {
  email: string;
}

@Injectable()
export class QirRepository extends BaseRepository<RowDataPacket> {
  private static readonly MUTABLE_COLUMNS = [
    'createdBy',
    'completedBy',
    'qir',
    'capaId',
    'type',
    'type1',
    'stakeholder',
    'owner',
    'priority',
    'createdDate',
    'active',
    'status',
    'assignedTo',
    'assignedDate',
    'respondBy',
    'origRespondDate',
    'issueComment',
    'issue_comment_html',
    'completedDate',
    'verifiedBy',
    'verifiedDate',
    'customerName',
    'purchaseOrder',
    'CustomerPartNumber',
    'eyefiPartNumber',
    'confirmationCode',
    'firstName',
    'lastName',
    'email',
    'source',
    'failureType',
    'queueStatus',
    'statusClosed',
    'requestSubmitted',
    'qtyAffected',
    'qtyAffected1',
    'customerReportedDate',
    'componentType',
    'platformType',
    'approved',
    'cl_input_main_id',
    'qaComments',
    'supplierName',
    'casinoName',
    'typeSub',
    'eyefiSerialNumber',
    'fieldServiceSchedulerId',
    'installer',
    'lotNumber',
    'dueDate',
    'ncr_id',
    'first_name',
    'last_name',
    'customerSerialNumber',
    'location',
    'cc_email',
    'warranty_replacement',
    'status_reason',
  ] as const;

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('qa_capaRequest', mysqlService);
  }

  async getList(params: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll: boolean;
  }): Promise<RowDataPacket[]> {
    const queryParams: unknown[] = [];

    let sql = `
      SELECT
        a.*, 
        CASE WHEN b.id THEN 'Yes' END AS qir_response_id,
        CASE WHEN a.createdBy <> 0 THEN CONCAT(c.first, ' ', c.last) ELSE a.email END AS createdBy
      FROM qa_capaRequest a
      LEFT JOIN qir_response b ON b.qir_number = a.id
      LEFT JOIN db.users c ON c.id = a.createdBy
      WHERE 1 = 1
    `;

    if (!params.isAll && params.dateFrom && params.dateTo) {
      sql += ' AND a.createdDate BETWEEN ? AND ?';
      queryParams.push(params.dateFrom, params.dateTo);
    }

    if (params.selectedViewType === 'Open') {
      sql += ` AND a.active = 1 AND a.status IN ('Open', 'In Process')`;
    } else if (params.selectedViewType === 'Closed') {
      sql += ` AND a.active = 1 AND a.status IN ('Closed', 'Rejected')`;
    }

    sql += ' ORDER BY a.createdDate DESC';

    return this.rawQuery<RowDataPacket>(sql, queryParams);
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    return this.findOne({ id });
  }

  async find(filters: Record<string, string>): Promise<RowDataPacket[]> {
    const allowedFilters = Object.fromEntries(
      Object.entries(filters).filter(([key]) =>
        (QirRepository.MUTABLE_COLUMNS as readonly string[]).includes(key) || key === 'id',
      ),
    );

    return super.find(allowedFilters);
  }

  async searchQir(text: string): Promise<RowDataPacket[]> {
    const sql = `
      SELECT *
      FROM qa_capaRequest
      WHERE CAST(id AS CHAR) LIKE ?
         OR qir LIKE ?
      ORDER BY id DESC
    `;

    const like = `%${text}%`;
    return this.rawQuery<RowDataPacket>(sql, [like, like]);
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    const data = this.getMutablePayload(payload);
    if (!data.createdDate) {
      data.createdDate = new Date();
    }

    return super.create(data);
  }

  async updateQirNumber(id: number, qirNumber: number): Promise<number> {
    return super.updateById(id, { qir: qirNumber });
  }

  async updateById(id: number, payload: Record<string, unknown>): Promise<number> {
    const data = this.getMutablePayload(payload);
    if (Object.keys(data).length === 0) {
      return 0;
    }

    return super.updateById(id, data);
  }

  async deleteById(id: number): Promise<number> {
    return super.deleteById(id);
  }

  async getNotificationRecipients(notificationKey: string): Promise<string[]> {
    const sql = `
      SELECT DISTINCT email
      FROM cron_email_notifications
      WHERE subscribed_to = ?
        AND active = 1
        AND email IS NOT NULL
        AND TRIM(email) <> ''
    `;

    const rows = await this.rawQuery<NotificationRecipientRow>(sql, [notificationKey]);
    return rows.map((row) => row.email.trim()).filter(Boolean);
  }

  private getMutablePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(([key]) =>
        (QirRepository.MUTABLE_COLUMNS as readonly string[]).includes(key),
      ),
    );
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

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
        a.id,
        a.status,
        a.qir,
        a.type,
        a.type1,
        a.active,
        a.priority,
        a.stakeholder,
        a.supplierName,
        a.customerName,
        a.customerReportedDate,
        a.CustomerPartNumber,
        a.eyefiPartNumber,
        a.eyefiSerialNumber,
        a.failureType,
        a.platformType,
        a.componentType,
        a.purchaseOrder,
        a.qtyAffected,
        a.qtyAffected1,
        a.createdDate,
        a.ncr_id,
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
    this.normalizeNumericFields(data);
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
    this.normalizeNumericFields(data);
    if (Object.keys(data).length === 0) {
      return 0;
    }

    return super.updateById(id, data);
  }

  async deleteById(id: number): Promise<number> {
    return super.deleteById(id);
  }

  private getMutablePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(([key]) =>
        (QirRepository.MUTABLE_COLUMNS as readonly string[]).includes(key),
      ),
    );
  }

  private normalizeNumericFields(payload: Record<string, unknown>): void {
    const normalizeInt = (value: unknown): number | null => {
      if (value === null || value === undefined) {
        return null;
      }

      if (typeof value === 'number') {
        return Number.isFinite(value) ? Math.trunc(value) : null;
      }

      const parsed = Number.parseInt(String(value).trim(), 10);
      return Number.isNaN(parsed) ? null : parsed;
    };

    if (Object.prototype.hasOwnProperty.call(payload, 'createdBy')) {
      const createdBy = normalizeInt(payload.createdBy);
      payload.createdBy = createdBy ?? 0;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'fieldServiceSchedulerId')) {
      const fieldServiceSchedulerId = normalizeInt(payload.fieldServiceSchedulerId);
      payload.fieldServiceSchedulerId = fieldServiceSchedulerId;
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class RmaRepository extends BaseRepository<RowDataPacket> {
  private static readonly ALLOWED_COLUMNS = [
    'id',
    'rmaNumber',
    'type',
    'dateIssued3',
    'dateIssued',
    'customer',
    'partNumber',
    'qty',
    'tag_qn_number',
    'returnMethod',
    'returnType',
    'failureCode',
    'customerComment',
    'notes',
    'createdDate',
    'createdBy',
    'orderNumber',
    'partDescription',
    'qirNumber',
    'disposition',
    'status',
    'active',
  ] as const;

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('rma', mysqlService);
  }

  async getList(params: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll: boolean;
  }): Promise<RowDataPacket[]> {
    const queryParams: unknown[] = [];

    let sql = `
      SELECT *
      FROM rma a
      WHERE 1 = 1
    `;

    if (!params.isAll && params.dateFrom && params.dateTo) {
      sql += ' AND a.createdDate BETWEEN ? AND ?';
      queryParams.push(params.dateFrom, params.dateTo);
    }

    if (params.selectedViewType === 'Open') {
      sql += ` AND a.active = 1 AND a.status = 'Open'`;
    } else if (params.selectedViewType === 'Closed') {
      sql += ` AND a.active = 1 AND a.status = 'Closed'`;
    }

    sql += ' ORDER BY a.createdDate DESC';

    return this.rawQuery<RowDataPacket>(sql, queryParams);
  }

  async find(filters: Record<string, unknown>): Promise<RowDataPacket[]> {
    const safeFilters = Object.fromEntries(
      Object.entries(filters).filter(([key]) =>
        (RmaRepository.ALLOWED_COLUMNS as readonly string[]).includes(key),
      ),
    );

    return super.find(safeFilters);
  }

  async getAll(): Promise<RowDataPacket[]> {
    return super.find();
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    return super.findOne({ id });
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafePayload(payload);
    return super.create(safePayload);
  }

  async updateById(id: number, payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafePayload(payload);
    if (Object.keys(safePayload).length === 0) {
      return 0;
    }

    return super.updateById(id, safePayload);
  }

  async deleteById(id: number): Promise<number> {
    return super.deleteById(id);
  }

  private getSafePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) => (RmaRepository.ALLOWED_COLUMNS as readonly string[]).includes(key) && key !== 'id',
      ),
    );
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class QirResponseRepository extends BaseRepository<RowDataPacket> {
  private static readonly MUTABLE_COLUMNS = [
    'qir_number',
    'findings',
    'document_control_response',
    'fs_engineering_reponse',
    'closure_date',
    'closure_by',
    'quality_team',
    'preliminary_investigation',
    'customer_qir_number',
    'created_date',
  ] as const;

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('qir_response', mysqlService);
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
      FROM qir_response a
      WHERE 1 = 1
    `;

    if (!params.isAll && params.dateFrom && params.dateTo) {
      sql += ' AND DATE(a.created_date) BETWEEN ? AND ?';
      queryParams.push(params.dateFrom, params.dateTo);
    }

    sql += ' ORDER BY a.created_date DESC';

    return this.rawQuery<RowDataPacket>(sql, queryParams);
  }

  async getAll(): Promise<RowDataPacket[]> {
    return super.find();
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    return this.findOne({ id });
  }

  async find(filters: Record<string, unknown>): Promise<RowDataPacket[]> {
    const allowed = this.getAllowedFilters(filters);
    return super.find(allowed);
  }

  async findOne(filters: Record<string, unknown>): Promise<RowDataPacket | null> {
    const allowed = this.getAllowedFilters(filters);
    if (Object.keys(allowed).length === 0) {
      return null;
    }

    return super.findOne(allowed);
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    const data = this.getMutablePayload(payload);
    if (!data.created_date) {
      data.created_date = new Date();
    }

    return super.create(data);
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

  private getMutablePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(([key]) =>
        (QirResponseRepository.MUTABLE_COLUMNS as readonly string[]).includes(key),
      ),
    );
  }

  private getAllowedFilters(filters: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(filters).filter(([key]) =>
        (QirResponseRepository.MUTABLE_COLUMNS as readonly string[]).includes(key) || key === 'id',
      ),
    );
  }
}

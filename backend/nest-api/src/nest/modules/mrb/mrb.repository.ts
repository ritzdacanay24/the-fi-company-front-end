import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

interface MrrRequestRow extends RowDataPacket {
  id: number;
}

@Injectable()
export class MrbRepository extends BaseRepository<RowDataPacket> {
  private static readonly ALLOWED_COLUMNS = new Set<string>([
    'id',
    'qirNumber',
    'createdBy',
    'createdDate',
    'itemCost',
    'disposition',
    'status',
    'comments',
    'active',
    'failureType',
    'componentType',
    'type',
    'partNumber',
    'partDescription',
    'dateReported',
    'qtyRejected',
    'wo_so',
    'rma',
    'mrbNumber',
    'lotNumber',
    'firstApproval',
    'secondApproval',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('mrb_request', mysqlService);
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
      FROM mrb_request a
      WHERE 1 = 1
    `;

    if (!params.isAll && params.dateFrom && params.dateTo) {
      sql += ` AND a.createdDate BETWEEN ? AND ?`;
      queryParams.push(params.dateFrom, params.dateTo);
    }

    if (params.selectedViewType === 'Open') {
      sql += ` AND a.active = 1 AND a.status = 'Open'`;
    } else if (params.selectedViewType === 'Closed') {
      sql += ` AND a.active = 1 AND a.status = 'Closed'`;
    }

    sql += ` ORDER BY a.createdDate DESC`;

    return this.rawQuery<RowDataPacket>(sql, queryParams);
  }

  async getAll(): Promise<RowDataPacket[]> {
    return super.find();
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    return this.findOne({ id });
  }

  async find(filters: Record<string, string>): Promise<RowDataPacket[]> {
    const allowedFilters: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (MrbRepository.ALLOWED_COLUMNS.has(key)) {
        allowedFilters[key] = value;
      }
    }

    return super.find(allowedFilters);
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    const entries = this.filterColumns(payload);
    if (entries.length === 0) {
      throw new Error('No valid MRB fields provided for create');
    }

    return super.create(Object.fromEntries(entries));
  }

  async updateById(id: number, payload: Record<string, unknown>): Promise<number> {
    const entries = this.filterColumns(payload);
    if (entries.length === 0) {
      return 0;
    }

    return super.updateById(id, Object.fromEntries(entries));
  }

  async deleteById(id: number): Promise<number> {
    return super.deleteById(id);
  }

  private filterColumns(payload: Record<string, unknown>): Array<[string, unknown]> {
    return Object.entries(payload).filter(([key]) => MrbRepository.ALLOWED_COLUMNS.has(key));
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class ShippingRequestRepository extends BaseRepository<RowDataPacket> {
  private static readonly ALLOWED_COLUMNS = [
    'id',
    'requestorName',
    'emailAddress',
    'companyName',
    'streetAddress',
    'streetAddress1',
    'city',
    'state',
    'zipCode',
    'contactName',
    'phoneNumber',
    'freightCharges',
    'thridPartyAccountNumber',
    'serviceTypeName',
    'saturdayDelivery',
    'cost',
    'sendTrackingNumberTo',
    'comments',
    'createdDate',
    'createdById',
    'active',
    'serviceType',
    'completedDate',
    'completedBy',
    'trackingNumber',
    'sendTrackingEmail',
  ] as const;

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('forms.shipping_request', mysqlService);
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
      FROM forms.shipping_request a
      WHERE 1 = 1
    `;

    if (params.selectedViewType !== 'Open' && !params.isAll && params.dateFrom && params.dateTo) {
      sql += ' AND DATE(a.createdDate) BETWEEN ? AND ?';
      queryParams.push(params.dateFrom, params.dateTo);
    }

    if (params.selectedViewType === 'Open') {
      sql += ' AND a.active = 1 AND a.completedDate IS NULL';
    } else if (params.selectedViewType === 'Active') {
      sql += ' AND a.active = 1';
    } else if (params.selectedViewType === 'Inactive') {
      sql += ' AND a.active = 0';
    }

    sql += ' ORDER BY a.createdDate DESC';

    return this.rawQuery<RowDataPacket>(sql, queryParams);
  }

  async find(filters: Record<string, unknown>): Promise<RowDataPacket[]> {
    const safeFilters = Object.fromEntries(
      Object.entries(filters).filter(([key]) =>
        (ShippingRequestRepository.ALLOWED_COLUMNS as readonly string[]).includes(key),
      ),
    );
    return super.find(safeFilters);
  }

  async getAll(): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>('SELECT * FROM forms.shipping_request');
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
    const safe = Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) =>
          (ShippingRequestRepository.ALLOWED_COLUMNS as readonly string[]).includes(key) && key !== 'id',
      ),
    );

    if (Array.isArray(safe.sendTrackingNumberTo)) {
      safe.sendTrackingNumberTo = safe.sendTrackingNumberTo.join(',');
    }

    return safe;
  }
}

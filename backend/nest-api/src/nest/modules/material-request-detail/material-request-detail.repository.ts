import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class MaterialRequestDetailRepository extends BaseRepository<RowDataPacket> {
  private static readonly ALLOWED_COLUMNS = [
    'id',
    'mrf_id',
    'partNumber',
    'qty',
    'createdDate',
    'createdBy',
    'qtyPicked',
    'printedBy',
    'printedDate',
    'pickCompletedDate',
    'trType',
    'ac_code',
    'reasonCode',
    'locationPickFrom',
    'active',
    'deleteReason',
    'deleteReasonDate',
    'deleteReasonBy',
    'cost',
    'notes',
    'shortage_id',
    'isDuplicate',
    'message',
    'availableQty',
    'description',
    'hasError',
    'validationStatus',
    'validationComment',
    'validatedBy',
    'validatedAt',
    'modifiedDate',
  ] as const;

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('mrf_det', mysqlService);
  }

  async find(filters: Record<string, unknown>): Promise<RowDataPacket[]> {
    const safeFilters = Object.fromEntries(
      Object.entries(filters).filter(([key]) =>
        (MaterialRequestDetailRepository.ALLOWED_COLUMNS as readonly string[]).includes(key),
      ),
    );
    return super.find(safeFilters);
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    return super.create(this.getSafePayload(payload));
  }

  async updateById(id: number, payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafePayload(payload);
    if (Object.keys(safePayload).length === 0) {
      return 0;
    }
    return super.updateById(id, safePayload);
  }

  private getSafePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) =>
          (MaterialRequestDetailRepository.ALLOWED_COLUMNS as readonly string[]).includes(key) && key !== 'id',
      ),
    );
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class QirSettingsRepository extends BaseRepository<RowDataPacket> {
  private static readonly ALLOWED_COLUMNS = [
    'id',
    'category',
    'name',
    'description',
    'active',
    'code',
    'showInPublic',
  ] as const;

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('qir_settings', mysqlService);
  }

  async find(filters: Record<string, unknown>): Promise<RowDataPacket[]> {
    const safeFilters = Object.fromEntries(
      Object.entries(filters).filter(([key]) =>
        (QirSettingsRepository.ALLOWED_COLUMNS as readonly string[]).includes(key),
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
        ([key]) =>
          (QirSettingsRepository.ALLOWED_COLUMNS as readonly string[]).includes(key) && key !== 'id',
      ),
    );
  }
}

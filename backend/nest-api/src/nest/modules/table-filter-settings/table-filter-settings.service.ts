import { ForbiddenException, Injectable } from '@nestjs/common';
import { TableFilterSettingsRepository } from './table-filter-settings.repository';

@Injectable()
export class TableFilterSettingsService {
  private readonly writableColumns = new Set<string>([
    'pageId',
    'tableNumber',
    'table_name',
    'table_description',
    'table_default',
    'tf_active',
    'is_public',
    'total_filters_applied',
    'is_default',
  ]);

  private readonly writableKeyAliases: Record<string, string> = {
    ft_active: 'tf_active',
  };

  constructor(private readonly repo: TableFilterSettingsRepository) {}

  private sanitizeWritablePayload(data: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(data)
        .map(([key, value]) => [this.writableKeyAliases[key] ?? key, value] as const)
        .filter(([key]) => this.writableColumns.has(key)),
    );
  }

  find(filters: Record<string, any>) {
    return this.repo.find(filters);
  }

  findOne(filters: Record<string, any>) {
    return this.repo.findOne(filters);
  }

  getAll() {
    return this.repo.getAll();
  }

  getById(id: number) {
    return this.repo.getById(id);
  }

  create(data: Record<string, any>, userId: number) {
    const payload = {
      ...this.sanitizeWritablePayload(data),
      userId,
    };

    return this.repo.create(payload);
  }

  async update(id: number, data: Record<string, any>, userId: number) {
    const ownedRecord = await this.repo.getByIdAndUserId(id, userId);
    if (!ownedRecord) {
      throw new ForbiddenException('You can only modify your own table filter settings');
    }

    const payload = this.sanitizeWritablePayload(data);
    if (Object.keys(payload).length === 0) {
      return;
    }

    return this.repo.update(id, payload);
  }

  async delete(id: number, userId: number) {
    const ownedRecord = await this.repo.getByIdAndUserId(id, userId);
    if (!ownedRecord) {
      throw new ForbiddenException('You can only modify your own table filter settings');
    }

    return this.repo.delete(id);
  }
}

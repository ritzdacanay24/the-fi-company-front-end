import { ForbiddenException, Injectable } from '@nestjs/common';
import { TableSettingsRepository } from './table-settings.repository';

@Injectable()
export class TableSettingsService {
  constructor(private readonly repo: TableSettingsRepository) {}

  private sanitizeWritablePayload(data: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(data).filter(([key]) => key !== 'id' && key !== 'userId'),
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
      throw new ForbiddenException('You can only modify your own table settings');
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
      throw new ForbiddenException('You can only modify your own table settings');
    }

    return this.repo.delete(id);
  }
}

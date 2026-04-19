import { Injectable } from '@nestjs/common';
import { TableSettingsRepository } from './table-settings.repository';

@Injectable()
export class TableSettingsService {
  constructor(private readonly repo: TableSettingsRepository) {}

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

  create(data: Record<string, any>) {
    return this.repo.create(data);
  }

  update(id: number, data: Record<string, any>) {
    return this.repo.update(id, data);
  }

  delete(id: number) {
    return this.repo.delete(id);
  }
}

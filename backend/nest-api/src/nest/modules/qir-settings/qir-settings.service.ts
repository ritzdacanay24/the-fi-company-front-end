import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { QirSettingsRepository } from './qir-settings.repository';

@Injectable()
export class QirSettingsService {
  constructor(private readonly repository: QirSettingsRepository) {}

  async find(filters: Record<string, unknown>) {
    return this.repository.find(filters);
  }

  async getAll() {
    return this.repository.getAll();
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_QIR_SETTING_NOT_FOUND',
        message: `QIR setting with id ${id} not found`,
      });
    }

    return row;
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    return { insertId };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const rowCount = await this.repository.updateById(id, payload);
    return { rowCount };
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }
}

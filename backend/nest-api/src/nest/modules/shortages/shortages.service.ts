import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { ShortagesRepository } from './shortages.repository';

@Injectable()
export class ShortagesService {
  constructor(private readonly repository: ShortagesRepository) {}

  async getList(params: { active?: number; queue?: string }): Promise<RowDataPacket[]> {
    return this.repository.getList(params);
  }

  async find(filters: Record<string, unknown>) {
    return this.repository.find(filters);
  }

  async getAll(selectedViewType?: string) {
    return this.repository.getAll(selectedViewType);
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_SHORTAGE_NOT_FOUND',
        message: `Shortage with id ${id} not found`,
      });
    }
    return row;
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    return { insertId };
  }

  async createShortages(data: Array<Record<string, unknown>>) {
    if (!Array.isArray(data) || data.length === 0) {
      return { insertCount: 0 };
    }

    const insertCount = await this.repository.createShortages(data);
    return { insertCount };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const rowCount = await this.repository.updateById(id, payload);
    return { rowCount };
  }

  async updateByPayload(payload: Record<string, unknown>) {
    const id = Number(payload.id || 0);
    if (!id) {
      return { rowCount: 0 };
    }

    return this.updateById(id, payload);
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }
}

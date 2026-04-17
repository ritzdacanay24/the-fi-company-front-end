import { Injectable, NotFoundException } from '@nestjs/common';
import { MaterialRequestDetailRepository } from './material-request-detail.repository';

@Injectable()
export class MaterialRequestDetailService {
  constructor(private readonly repository: MaterialRequestDetailRepository) {}

  async find(filters: Record<string, unknown>) {
    return this.repository.find(filters);
  }

  async getAll() {
    return this.repository.find({});
  }

  async getById(id: number) {
    const row = await this.repository.findOne({ id });
    if (!row) {
      throw new NotFoundException({
        code: 'RC_MRF_DETAIL_NOT_FOUND',
        message: `Material request detail with id ${id} not found`,
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

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TripDetailHeaderRepository } from './trip-detail-header.repository';

@Injectable()
export class TripDetailHeaderService {
  constructor(private readonly repository: TripDetailHeaderRepository) {}

  async getAll() {
    return this.repository.getAll();
  }

  async find(query: Record<string, unknown>) {
    return this.repository.find(query);
  }

  async getById(id: number) {
    return this.repository.getById(id);
  }

  async create(payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    const created = await this.repository.getById(insertId);
    if (!created) {
      throw new NotFoundException('Trip detail header not found after create');
    }

    return created;
  }

  async update(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    await this.repository.updateById(id, sanitized);
    return this.repository.getById(id);
  }

  async delete(id: number) {
    await this.repository.deleteById(id);
    return { success: true };
  }

  async getByGroup() {
    return this.repository.getByGroup();
  }

  async multipleGroups(id: number) {
    return this.repository.multipleGroups(id);
  }
}

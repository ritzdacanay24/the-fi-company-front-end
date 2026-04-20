import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerVisitRepository } from './customer-visit.repository';

@Injectable()
export class CustomerVisitService {
  constructor(private readonly repository: CustomerVisitRepository) {}

  async getAll() {
    return this.repository.find();
  }

  async find(query: Record<string, unknown>) {
    return this.repository.find(query);
  }

  async getById(id: number) {
    return this.repository.findOne({ id });
  }

  async create(payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    const created = await this.repository.findOne({ id: insertId });
    if (!created) {
      throw new NotFoundException('Customer visit not found after create');
    }

    return created;
  }

  async update(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    await this.repository.updateById(id, sanitized);
    return this.repository.findOne({ id });
  }

  async delete(id: number) {
    await this.repository.deleteById(id);
    return { success: true };
  }
}

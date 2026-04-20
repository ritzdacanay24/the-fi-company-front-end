import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StatusCategoryRepository } from './status-category.repository';

@Injectable()
export class StatusCategoryService {
  constructor(private readonly repository: StatusCategoryRepository) {}

  async find(query: Record<string, unknown>) {
    return this.repository.find(query);
  }

  async getAll() {
    return this.repository.find();
  }

  async getById(id: number) {
    const row = await this.repository.findOne({ id });
    if (!row) {
      throw new NotFoundException(`Status category ${id} not found`);
    }
    return row;
  }

  async create(payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    return { message: 'Created successfully', insertId };
  }

  async update(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Status category ${id} not found`);
    }

    return { message: 'Updated successfully' };
  }
}

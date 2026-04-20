import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReceiptCategoryRepository } from './receipt-category.repository';

@Injectable()
export class ReceiptCategoryService {
  constructor(private readonly repository: ReceiptCategoryRepository) {}

  async getAll(selectedViewType?: string) {
    return this.repository.getAll(selectedViewType);
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
      throw new NotFoundException('Receipt category not found after create');
    }

    return created;
  }

  async update(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Receipt category ${id} not found`);
    }

    return this.repository.findOne({ id });
  }

  async delete(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    if (!affectedRows) {
      throw new NotFoundException(`Receipt category ${id} not found`);
    }

    return { success: true };
  }
}

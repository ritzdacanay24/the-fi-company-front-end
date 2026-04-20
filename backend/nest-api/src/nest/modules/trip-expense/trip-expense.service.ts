import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TripExpenseRepository } from './trip-expense.repository';

@Injectable()
export class TripExpenseService {
  constructor(private readonly repository: TripExpenseRepository) {}

  getByWorkOrderId(workOrderId: number) {
    return this.repository.getByWorkOrderId(workOrderId);
  }

  getByFsId(fsSchedulerId: number) {
    return this.repository.getByFsId(fsSchedulerId);
  }

  async getById(id: number) {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException(`Trip expense ${id} not found`);
    }

    return row;
  }

  async create(payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    return { insertId, message: 'Created successfully' };
  }

  async update(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Trip expense ${id} not found`);
    }

    return { message: 'Updated successfully' };
  }

  async delete(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    if (!affectedRows) {
      throw new NotFoundException(`Trip expense ${id} not found`);
    }

    return { success: true };
  }
}

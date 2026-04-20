import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SerialRepository } from './serial.repository';

@Injectable()
export class SerialService {
  constructor(private readonly repository: SerialRepository) {}

  async getAll() {
    return this.repository.find();
  }

  async find(params: Record<string, unknown>) {
    const clean = Object.fromEntries(
      Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );

    if (!Object.keys(clean).length) {
      return this.repository.find();
    }

    return this.repository.find(clean);
  }

  async getById(id: number) {
    return this.repository.findOne({ id });
  }

  async getByWorkOrderId(workOrderId: number) {
    return this.repository.getByWorkOrderId(workOrderId);
  }

  async create(payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    return this.repository.findOne({ id: insertId });
  }

  async update(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Serial ${id} not found`);
    }

    return this.repository.findOne({ id });
  }

  async delete(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    if (!affectedRows) {
      throw new NotFoundException(`Serial ${id} not found`);
    }

    return { message: 'Deleted' };
  }
}

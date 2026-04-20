import { BadRequestException, Injectable } from '@nestjs/common';
import { FsQirRepository } from './fs-qir.repository';

@Injectable()
export class FsQirService {
  constructor(private readonly repository: FsQirRepository) {}

  getByWorkOrderId(workOrderId: number) {
    return this.repository.getByWorkOrderId(workOrderId);
  }

  getById(id: number) {
    return this.repository.getById(id);
  }

  async create(payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    await this.repository.create(sanitized);
    return sanitized;
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    return { affectedRows };
  }

  async deleteById(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    return { affectedRows };
  }
}

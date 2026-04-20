import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TeamRepository } from './team.repository';

@Injectable()
export class TeamService {
  constructor(private readonly repository: TeamRepository) {}

  async getAll() {
    return this.repository.findInView();
  }

  async find(query: Record<string, unknown>) {
    return this.repository.findInView(query);
  }

  async getById(id: number) {
    return this.repository.findOneInView(id);
  }

  async getByFsId(fsDetId: number) {
    return this.repository.getByFsId(fsDetId);
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
    return this.repository.findOneInView(insertId);
  }

  async update(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Team member ${id} not found`);
    }

    return this.repository.findOneInView(id);
  }

  async delete(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    if (!affectedRows) {
      throw new NotFoundException(`Team member ${id} not found`);
    }

    return { success: true };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JobCommentsRepository } from './job-comments.repository';

@Injectable()
export class JobCommentsService {
  constructor(private readonly repository: JobCommentsRepository) {}

  async getAll() {
    return this.repository.find();
  }

  async getById(id: number) {
    return this.repository.findOne({ id });
  }

  async getJobCommentsByFsId(fsId: number) {
    return this.repository.getByFsId(fsId);
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
      throw new NotFoundException(`Job comment ${id} not found`);
    }

    return this.repository.findOne({ id });
  }

  async delete(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    if (!affectedRows) {
      throw new NotFoundException(`Job comment ${id} not found`);
    }

    return { success: true };
  }
}

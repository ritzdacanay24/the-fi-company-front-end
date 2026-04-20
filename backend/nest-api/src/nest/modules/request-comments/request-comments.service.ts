import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestCommentsRepository } from './request-comments.repository';

@Injectable()
export class RequestCommentsService {
  constructor(private readonly repository: RequestCommentsRepository) {}

  async getAll() {
    return this.repository.find();
  }

  async getByRequestId(fsRequestId: number) {
    return this.repository.getByRequestId(fsRequestId);
  }

  async createComment(token: string | undefined, toEmail: string | undefined, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);

    if (toEmail && !sanitized.email) {
      sanitized.email = toEmail;
    }

    if (!sanitized.created_date) {
      sanitized.created_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    return this.repository.findOne({ id: insertId });
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    const sanitized = this.repository.sanitizePayload(payload);

    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Request comment ${id} not found`);
    }

    return this.repository.findOne({ id });
  }
}

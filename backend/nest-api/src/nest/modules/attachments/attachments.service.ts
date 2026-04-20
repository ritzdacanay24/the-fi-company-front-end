import { Injectable } from '@nestjs/common';
import { AttachmentsRepository } from './attachments.repository';

@Injectable()
export class AttachmentsService {
  constructor(private readonly repository: AttachmentsRepository) {}

  async find(filters: Record<string, string>) {
    return this.repository.find(filters);
  }

  async getAllRelatedAttachments(id: number) {
    return this.repository.getAllRelatedAttachments(id);
  }

  async deleteById(id: number) {
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }
}

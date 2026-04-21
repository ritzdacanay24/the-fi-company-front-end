import { Injectable } from '@nestjs/common';
import { AttachmentsRepository } from './attachments.repository';

@Injectable()
export class AttachmentsMetadataService {
  constructor(private readonly repository: AttachmentsRepository) {}

  createAttachment(payload: Record<string, unknown>) {
    return this.repository.createAttachment(payload);
  }

  getByWorkOrderId(workOrderId: number) {
    return this.repository.getByWorkOrderId(workOrderId);
  }

  find(filters: Record<string, string>) {
    return this.repository.find(filters);
  }

  getAllRelatedAttachments(id: number) {
    return this.repository.getAllRelatedAttachments(id);
  }

  getById(id: number) {
    return this.repository.findOne({ id });
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    const rowCount = await this.repository.updateAttachment(id, payload);
    return { rowCount };
  }

  async deleteById(id: number) {
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }
}

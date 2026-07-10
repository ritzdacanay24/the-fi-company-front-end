import { Injectable } from '@nestjs/common';
import { AttachmentsRepository } from './attachments.repository';

@Injectable()
export class AttachmentsMetadataService {
  constructor(private readonly repository: AttachmentsRepository) {}

  createAttachmentFromS3(params: {
    fileName: string;
    s3Bucket: string;
    s3Key: string;
    mimeType: string;
    fileSize: number;
    field: string;
    createdBy: number;
    mainId?: number;
  }): Promise<number> {
    const createdDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    return this.repository.createAttachment({
      fileName: params.fileName,
      link: params.s3Key,
      storage_source: 'bucket',
      storage_bucket: params.s3Bucket,
      storage_key: params.s3Key,
      ext: params.mimeType || 'application/octet-stream',
      fileSize: params.fileSize || 0,
      createdDate,
      field: params.field,
      createdBy: params.createdBy,
      mainId: params.mainId,
    });
  }

  getById(id: number) {
    return this.repository.getById(id);
  }

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

  updateById(id: number, payload: Record<string, unknown>) {
    return this.repository.updateById(id, payload);
  }

  deleteById(id: number) {
    return this.repository.deleteById(id);
  }
}
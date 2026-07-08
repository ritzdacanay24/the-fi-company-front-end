import { Injectable } from '@nestjs/common';
import { AttachmentsRepository } from './attachments.repository';

@Injectable()
export class AttachmentsMetadataService {
  constructor(private readonly repository: AttachmentsRepository) {}

  createAttachmentFromS3(
    fileName: string,
    s3Bucket: string,
    s3Key: string,
    mimeType: string,
    fileSize: number,
    field: string,
    createdBy: number,
    mainId?: number,
  ): Promise<number> {
    const createdDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    return this.repository.createAttachment({
      fileName,
      link: s3Key,
      storage_source: 'bucket',
      storage_bucket: s3Bucket,
      storage_key: s3Key,
      ext: mimeType || 'application/octet-stream',
      fileSize: fileSize || 0,
      createdDate,
      field,
      createdBy,
      mainId,
    });
  }

  getById(id: number) {
    return this.repository.getById(id);
  }

  createAttachment(payload: Record<string, unknown>) {
    return this.repository.createAttachment(payload);
  }
}
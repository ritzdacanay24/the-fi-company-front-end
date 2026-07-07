import { Injectable } from '@nestjs/common';
import { AttachmentsRepository } from './attachments.repository';

interface S3UploadResult {
  bucket: string;
  s3Key: string;
  fileName: string;
  fileUrl?: string;
}

interface CreateAttachmentOptions {
  field: string; // Required: 'support_ticket', 'fieldService', 'capa', etc
  [key: string]: unknown; // Additional metadata
}

@Injectable()
export class AttachmentsMetadataService {
  constructor(private readonly repository: AttachmentsRepository) {}

  /**
   * Create attachment from S3 upload result with minimal parameters
   * Handles all defaults and formatting internally
   */
  createAttachmentFromS3(
    originalFileName: string,
    s3Result: S3UploadResult,
    options: CreateAttachmentOptions,
  ): Promise<number> {
    const createdDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    return this.repository.createAttachment({
      fileName: originalFileName,
      originalFileName: originalFileName,
      storedFileName: s3Result.fileName,
      bucketKey: s3Result.s3Key,
      bucket: s3Result.bucket,
      link: s3Result.s3Key, // Store only the key, not signed URL
      storage_source: 'bucket',
      mime_type: options.mime_type || 'application/octet-stream',
      file_size: options.file_size || 0,
      createdDate,
      field: options.field,
      ...Object.fromEntries(
        Object.entries(options).filter(([key]) => key !== 'field' && key !== 'mime_type' && key !== 'file_size')
      ),
    });
  }

  // Legacy method for backward compatibility
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

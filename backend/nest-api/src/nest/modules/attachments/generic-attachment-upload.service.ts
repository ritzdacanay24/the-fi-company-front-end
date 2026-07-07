import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { FileStorageService } from '@/nest/modules/file-storage/file-storage.service';
import { AttachmentsMetadataService } from './attachments-metadata.service';

interface UploadOptions {
  /** S3 bucket key prefix (folder path). Required. Example: 'support-tickets/123', 'fieldService/456' */
  keyPrefix: string;
  /** Database field name. Required. Example: 'support_ticket', 'fieldService', 'capa' */
  field: string;
  /** Optional bucket name. Uses default if not provided */
  bucket?: string;
  /** Optional fixed filename. Auto-generated if not provided */
  fixedFileName?: string;
  /** Optional MIME type. Auto-detected from file if not provided */
  mimetype?: string;
  /** Optional metadata to store in database */
  metadata?: Record<string, unknown>;
}

interface UploadResult {
  /** Database attachment ID */
  id: number;
  /** Original filename */
  fileName: string;
  /** S3 bucket name */
  bucket: string;
  /** S3 object key */
  s3Key: string;
  /** Signed URL for accessing the file */
  fileUrl: string;
  /** File size in bytes */
  fileSize?: number;
  /** MIME type */
  mimeType?: string;
}

/**
 * Generic Attachment Upload Service
 * 
 * Provides atomic file upload to AWS S3 with database record creation.
 * Ensures data consistency with automatic rollback on errors.
 * 
 * Usage:
 * ```typescript
 * const result = await this.attachmentUploadService.upload(file, {
 *   keyPrefix: 'support-tickets/123',
 *   field: 'support_ticket', // REQUIRED - explicitly specify the field/source
 *   metadata: { ticket_id: 123, uploaded_by: user.id }
 * });
 * ```
 */
@Injectable()
export class GenericAttachmentUploadService {
  private readonly logger = new Logger(GenericAttachmentUploadService.name);

  constructor(
    private readonly fileStorageService: FileStorageService,
    private readonly attachmentsMetadataService: AttachmentsMetadataService,
  ) {}

  /**
   * Upload a file to S3 and create a database attachment record atomically.
   * 
   * @param file - File to upload (must have originalname and buffer)
   * @param options - Upload options including required keyPrefix
   * @returns Upload result with file URL and database ID
   * @throws BadRequestException if file or keyPrefix is missing
   * @throws Error if S3 upload or database creation fails
   * 
   * Atomic behavior:
   * - If S3 upload fails: No database record created
   * - If database creation fails: S3 file is deleted (rollback)
   */
  async upload(
    file?: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number },
    options?: UploadOptions,
  ): Promise<UploadResult> {
    // Validate input
    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('File with originalname and buffer is required');
    }

    const keyPrefix = options?.keyPrefix?.trim();
    if (!keyPrefix) {
      throw new BadRequestException('keyPrefix is required. Specify folder path (e.g., "support-tickets/123")');
    }

    const field = options?.field?.trim();
    if (!field) {
      throw new BadRequestException('field is required. Specify what this attachment is for (e.g., "support_ticket", "fieldService", "capa")');
    }

    let s3Key: string | null = null;
    let bucketName: string | null = null;
    let fileUrl: string | null = null;

    try {
      // Step 1: Upload to S3
      const uploadResult = await this.fileStorageService.storeUploadedFileInBucket(file, {
        bucket: options?.bucket,
        keyPrefix,
        fixedFileName: options?.fixedFileName,
      });

      s3Key = uploadResult.key;
      bucketName = uploadResult.bucket;

      // Step 2: Get signed URL
      fileUrl = await this.fileStorageService.resolveBucketObjectUrl(bucketName, s3Key);

      if (!fileUrl) {
        throw new InternalServerErrorException('Failed to generate signed URL for uploaded file');
      }

      // Step 3: Create database record (atomic)
      // Store only the S3 key (short), not the signed URL (very long)
      // Signed URLs expire anyway, we'll generate fresh ones on-the-fly when needed
      const createdDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const attachmentId = await this.attachmentsMetadataService.createAttachment({
        fileName: file.originalname,
        originalFileName: file.originalname,
        storedFileName: uploadResult.fileName,
        bucketKey: s3Key,
        bucket: bucketName,
        link: s3Key, // Store only the key, not the full signed URL
        storage_source: 'bucket',
        mime_type: file.mimetype || 'application/octet-stream',
        file_size: file.size || 0,
        createdDate,
        field, // Use explicitly provided field value
        ...options?.metadata,
      });

      this.logger.log(
        `Attachment uploaded: id=${attachmentId}, bucket=${bucketName}, key=${s3Key}, file=${file.originalname}`,
      );

      return {
        id: attachmentId,
        fileName: file.originalname,
        bucket: bucketName,
        s3Key,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      // Rollback: Delete S3 file if database creation failed
      if (s3Key && bucketName) {
        this.logger.warn(
          `Upload failed. Rolling back S3 file: bucket=${bucketName}, key=${s3Key}`,
        );

        try {
          await this.fileStorageService.deleteStoredFileInBucket(s3Key, bucketName);
        } catch (deleteError) {
          this.logger.error(
            `Failed to rollback S3 file deletion: ${(deleteError as Error)?.message}`,
            (deleteError as Error)?.stack,
          );
        }
      }

      this.logger.error(
        `Attachment upload failed: ${(error as Error)?.message}`,
        (error as Error)?.stack,
      );

      throw error;
    }
  }
}

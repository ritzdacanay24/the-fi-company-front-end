import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';

/**
 * S3 Upload Service
 * 
 * Pure utility for uploading files to AWS S3.
 * No database logic - just storage.
 * Callers are responsible for atomicity with their own DB operations.
 */
export interface S3UploadResult {
  bucket: string;
  key: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
}

@Injectable()
export class S3UploadService {
  private readonly logger = new Logger(S3UploadService.name);

  constructor(private readonly fileStorageService: FileStorageService) {}

  /**
   * Upload a file to S3 bucket.
   * 
   * @param file - File to upload
   * @param keyPrefix - Bucket folder path (e.g., 'support-tickets/123')
   * @param bucket - Optional bucket name. Uses default if not provided.
   * @returns S3 upload result with fileUrl and s3Key for later deletion
   * @throws BadRequestException if file or keyPrefix is invalid
   */
  async upload(
    file: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number } | undefined,
    keyPrefix: string,
    bucket?: string,
  ): Promise<S3UploadResult> {
    // Validate input
    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('File with originalname and buffer is required');
    }

    const prefix = keyPrefix?.trim();
    if (!prefix) {
      throw new BadRequestException('keyPrefix is required (e.g., "support-tickets/123")');
    }

    // Upload to S3
    const uploadResult = await this.fileStorageService.storeUploadedFileInBucket(file, {
      bucket,
      keyPrefix: prefix,
    });

    // Get signed URL
    const fileUrl = await this.fileStorageService.resolveBucketObjectUrl(
      uploadResult.bucket,
      uploadResult.key,
    );

    if (!fileUrl) {
      // If we can't get a URL, delete the file we just uploaded
      await this.deleteFile(uploadResult.key, uploadResult.bucket).catch(() => {
        // Best-effort cleanup
      });
      throw new Error('Failed to generate signed URL for uploaded file');
    }

    this.logger.log(
      `S3 upload successful: bucket=${uploadResult.bucket}, key=${uploadResult.key}, file=${file.originalname}`,
    );

    return {
      bucket: uploadResult.bucket,
      key: uploadResult.key,
      fileName: uploadResult.fileName,
      fileUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Generate a signed URL for an existing S3 object.
   * 
   * @param s3Key - S3 object key
   * @param bucket - Optional bucket name. Uses default if not provided.
   * @returns Signed URL for accessing the file
   */
  async getSignedUrl(s3Key: string, bucket?: string): Promise<string> {
    if (!s3Key) {
      throw new BadRequestException('S3 key is required');
    }

    try {
      const url = await this.fileStorageService.resolveBucketObjectUrl(
        bucket || '',
        s3Key,
      );
      if (!url) {
        throw new Error('Failed to generate signed URL');
      }
      return url;
    } catch (error) {
      this.logger.warn(
        `Failed to generate signed URL: bucket=${bucket}, key=${s3Key}, error=${(error as Error)?.message}`,
      );
      throw error;
    }
  }

  /**
   * Delete a file from S3.
   * Used for rollback when database operations fail.
   * 
   * @param s3Key - S3 object key
   * @param bucket - Optional bucket name
   */
  async deleteFile(s3Key: string, bucket?: string): Promise<void> {
    try {
      await this.fileStorageService.deleteStoredFileInBucket(s3Key, bucket);
      this.logger.log(`S3 file deleted: bucket=${bucket}, key=${s3Key}`);
    } catch (error) {
      this.logger.warn(
        `Failed to delete S3 file: bucket=${bucket}, key=${s3Key}, error=${(error as Error)?.message}`,
      );
      throw error;
    }
  }
}

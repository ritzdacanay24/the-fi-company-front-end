import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { extname } from 'node:path';
import { AttachmentsMetadataService } from './attachments-metadata.service';
import { AttachmentsRepository } from './attachments.repository';
import { FileStorageService } from '@/nest/modules/file-storage/file-storage.service';
import { S3UploadService } from '@/nest/modules/file-storage/s3-upload.service';
import { FeatureType, FEATURE_CONFIG } from '@/shared/enums/feature.enum';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly metadataService: AttachmentsMetadataService,
    private readonly storageService: FileStorageService,
    private readonly s3UploadService: S3UploadService,
    private readonly repository: AttachmentsRepository,
  ) {}

  /**
   * Create attachment with explicit subFolder requirement
   * @param payload Must include 'subFolder' key - no inference/magic strings allowed
   * @param file File to upload
   * @throws BadRequestException if subFolder is missing or invalid
   */
  async create(
    payload: Record<string, unknown>,
    file?: { originalname?: string; buffer?: Buffer },
    userIdFromContext?: number,
  ) {
    // REQUIRED: Explicit subFolder - no string pattern matching
    const subFolder = typeof payload?.subFolder === 'string' ? payload.subFolder.trim() : '';
    if (!subFolder) {
      throw new BadRequestException('subFolder is required in payload (e.g., "fieldService", "capa", "shippingChecklist", "general")');
    }

    // Validate subFolder path to prevent traversal
    const safeSubFolder = this.resolveGenericSubFolder(subFolder);
    if (!safeSubFolder) {
      throw new BadRequestException('Invalid subFolder path');
    }

    const isBucketMode = this.storageService.isS3Mode();
    let storedFileName = '';
    let bucketKey: string | null = null;

    if (isBucketMode) {
      const stored = await this.storageService.storeUploadedFileInBucket(file, { keyPrefix: safeSubFolder });
      storedFileName = stored.fileName;
      bucketKey = stored.key;
    } else {
      storedFileName = await this.storageService.storeUploadedFile(file, safeSubFolder);
    }

    const normalizedPayload = this.normalizeCreatePayload(
      payload,
      storedFileName,
      file?.originalname,
      bucketKey,
      isBucketMode ? 'bucket' : 'local',
      safeSubFolder,
      userIdFromContext,
    );

    try {
      const insertId = await this.metadataService.createAttachment(normalizedPayload);

      return { message: 'Created successfully', insertId };
    } catch (error) {
      if (isBucketMode && bucketKey) {
        await this.storageService.deleteStoredFileInBucket(bucketKey);
      } else {
        await this.storageService.deleteStoredFile(storedFileName, safeSubFolder);
      }
      throw error;
    }
  }

  /**
   * Upload file to a specific folder
   * @param file File to upload
   * @param folder Explicit folder path (required) - no defaults or inference
   * @throws BadRequestException if folder is missing or invalid
   */
  async uploadToFolder(
    file?: { originalname?: string; buffer?: Buffer },
    folder?: string,
  ) {
    if (!folder || !folder.trim()) {
      throw new BadRequestException('folder parameter is required and cannot be empty');
    }

    const subFolder = this.resolveGenericSubFolder(folder);
    if (!subFolder) {
      throw new BadRequestException(`Invalid folder path: "${folder}"`);
    }

    const storedFileName = await this.storageService.storeUploadedFile(file, subFolder);
    const url = this.storageService.resolveLink(storedFileName, subFolder);

    return {
      success: true,
      fileName: storedFileName,
      url,
      subFolder,
    };
  }

  /**
   * Unified attachment upload for all features (support-tickets, parts-order, etc.)
   * Implements atomic upload: S3 + DB with automatic rollback on failure
   */
  async uploadAttachmentForFeature(
    feature: string,
    id: number,
    file: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number } | undefined,
    userId: number,
    uploaderNameFromContext?: string,
  ): Promise<any> {
    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('File is required');
    }

    // Map feature to configuration
    const featureConfig = this.getFeatureConfig(feature, id);

    let s3Result: any = null;

    try {
      // Step 1: Upload to S3
      s3Result = await this.s3UploadService.upload(file, featureConfig.s3Prefix);

      // Step 2: Insert into attachments table
      const attachmentId = await this.metadataService.createAttachmentFromS3({
        fileName: file.originalname,
        s3Bucket: s3Result.bucket,
        s3Key: s3Result.key,
        mimeType: file.mimetype || 'application/octet-stream',
        fileSize: file.size || 0,
        field: featureConfig.field,
        createdBy: userId,
        mainId: id,
      });

      // Step 3: Generate signed URL for immediate frontend use
      const signedUrl = await this.storageService.resolveBucketObjectUrl(
        s3Result.bucket,
        s3Result.key,
      );

      // Step 4: Use authenticated user context for uploader name only.
      const uploaderName =
        typeof uploaderNameFromContext === 'string' && uploaderNameFromContext.trim()
          ? uploaderNameFromContext.trim()
          : null;

      // Return normalized response matching frontend expectations
      return {
        id: attachmentId,
        ticket_id: id,
        comment_id: null,
        file_name: file.originalname,
        file_url: signedUrl,
        mime_type: file.mimetype || 'application/octet-stream',
        file_size: file.size || 0,
        uploaded_by: userId,
        user_name: uploaderName,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      // Rollback: Delete from S3 if database operation failed
      if (s3Result?.key && s3Result?.bucket) {
        try {
          await this.s3UploadService.deleteFile(s3Result.key, s3Result.bucket);
        } catch (deleteError) {
          this.logger.error(`Failed to rollback S3 file: ${s3Result.key}`, deleteError);
        }
      }
      throw error;
    }
  }

  /**
   * Get attachments for a specific feature and resource ID
   * Automatically handles legacy field names for backward compatibility
   * Generates signed URLs for S3-stored files before returning to frontend
   * Normalizes response to match frontend expectations (link -> file_url)
   * 
   * @param feature - Feature identifier (e.g., 'support-tickets', 'parts-order')
   * @param id - Resource ID (e.g., ticket ID, order ID)
   * @returns Array of attachments with signed URLs for S3 files and normalized field names
   * 
   * @example
   * const attachments = await attachmentsService.getAttachmentsByFeature('support-tickets', ticketId);
   */
  async getAttachmentsByFeature(feature: string, id: number): Promise<any[]> {
    const config = this.getFeatureConfig(feature, id);
    
    // Query with both new field name and legacy names
    const allFieldNames = [config.field, ...config.legacyNames];
    
    const rows = await this.repository.getByFieldAndId(allFieldNames, id);
    
    return Promise.all(
      rows.map(async (row) => {
        const resolved = await this.storageService.withResolvedLink(row as Record<string, unknown>);

        const fileName = typeof resolved.file_name === 'string' ? resolved.file_name.trim() : '';
        if (!fileName) {
          throw new BadRequestException(`Attachment ${String(resolved.id)} is missing file_name`);
        }

        const storageSource = String(resolved.storage_source || '').trim().toLowerCase();
        const bucket = typeof resolved.bucket === 'string' ? resolved.bucket.trim() : '';
        const key = typeof resolved.storage_key === 'string' ? resolved.storage_key.trim() : '';

        let fileUrl = typeof resolved.link === 'string' ? resolved.link.trim() : '';
        if (storageSource === 'bucket') {
          if (!bucket || !key) {
            throw new BadRequestException(
              `Attachment ${String(resolved.id)} has invalid bucket storage metadata`,
            );
          }

          fileUrl = await this.storageService.resolveBucketObjectUrl(bucket, key);
        }

        if (!fileUrl) {
          throw new BadRequestException(`Attachment ${String(resolved.id)} is missing file_url`);
        }

        return {
          id: resolved.id,
          ticket_id: id,
          comment_id: null,
          file_name: fileName,
          file_url: fileUrl,
          mime_type: resolved.mime_type,
          file_size: resolved.file_size,
          uploaded_by: resolved.uploaded_by,
          user_name: resolved.created_by_name,
          created_at: resolved.created_at,
        };
      }),
    );
  }

  /**
   * Get feature-specific configuration for uploads
   * Maps feature identifier to S3 path, new standardized field name, and legacy names
   * Supports nested paths (e.g., checklist/instance)
   * 
   * Returns both new field name (for inserts) and legacy names (for backward-compatible queries)
   */
  private getFeatureConfig(feature: string, id: number): { s3Prefix: string; field: string; legacyNames: string[] } {
    // Validate feature is a known type
    const validFeatures = Object.values(FeatureType);
    if (!validFeatures.includes(feature as FeatureType)) {
      throw new BadRequestException(`Unsupported feature: ${feature}. Valid features: ${validFeatures.join(', ')}`);
    }

    const featureKey = feature as FeatureType;
    const config = FEATURE_CONFIG[featureKey];

    if (!config) {
      throw new BadRequestException(`Configuration not found for feature: ${feature}`);
    }

    // Replace {id} placeholder with actual resource ID
    const s3Prefix = config.s3Prefix.replace('{id}', String(id));
    if (!Array.isArray(config.legacyNames)) {
      throw new BadRequestException(`Invalid legacyNames configuration for feature: ${feature}`);
    }

    const legacyNames = config.legacyNames;

    return {
      s3Prefix,
      field: config.field,
      legacyNames,
    };
  }

  /**
   * REMOVED: Fragile string pattern matching inference
   * All callers must now explicitly pass subFolder parameter
   * This prevents magical behavior and makes requirements explicit
   */
  // Removed resolveSubFolder - use explicit parameters instead

  private resolveGenericSubFolder(folder?: string): string {
    if (!folder || !folder.trim()) {
      return 'general';
    }

    const normalized = folder
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    if (!normalized) {
      return 'general';
    }

    const segments = normalized.split('/').filter(Boolean);
    if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
      return 'general';
    }

    const safeSegments = segments.map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ''));
    const safe = safeSegments.filter(Boolean).join('/');
    return safe || 'general';
  }

  async getByWorkOrderId(workOrderId: number) {
    const rows = await this.metadataService.getByWorkOrderId(workOrderId);
    return Promise.all(
      (rows as Array<Record<string, unknown>>).map((row) =>
        this.storageService.withResolvedLink(row),
      ),
    );
  }

  async find(filters: Record<string, string>) {
    const rows = await this.metadataService.find(filters);
    return Promise.all(
      (rows as Array<Record<string, unknown>>).map((row) =>
        this.storageService.withResolvedLink(row),
      ),
    );
  }

  async getAllRelatedAttachments(id: number) {
    const rows = await this.metadataService.getAllRelatedAttachments(id);
    return Promise.all(
      (rows as Array<Record<string, unknown>>).map((row) =>
        this.storageService.withResolvedLink(row),
      ),
    );
  }

  async getViewById(id: number) {
    const row = await this.metadataService.getById(id);
    if (!row) {
      throw new NotFoundException('Attachment not found');
    }

    const resolved = await this.storageService.withResolvedLink(row as Record<string, unknown>);
    const storageSource = String(resolved?.storage_source || '').trim().toLowerCase();
    const link = typeof resolved?.link === 'string' ? resolved.link.trim() : '';
    const isAbsoluteHttpLink = /^https?:\/\//i.test(link);

    let url = '';
    if (storageSource === 'bucket') {
      const bucket = typeof resolved?.storage_bucket === 'string'
        ? resolved.storage_bucket.trim()
        : typeof resolved?.bucket === 'string'
          ? resolved.bucket.trim()
          : '';
      const key = typeof resolved?.storage_key === 'string' && resolved.storage_key.trim()
        ? resolved.storage_key.trim()
        : (!isAbsoluteHttpLink && link ? this.resolveBucketKeyFromLink(link) : '');

      if (key) {
        url = await this.storageService.resolveBucketObjectUrl(bucket, key);
      } else if (link) {
        // Legacy/mixed records may still have a usable direct link even when storage_source is bucket.
        url = link;
      }
    } else {
      url = link;
    }

    if (!url) {
      throw new NotFoundException('Attachment URL not available');
    }

    return {
      id,
      url,
      fileName: resolved?.fileName || resolved?.file_name,
      storage_source: resolved?.storage_source,
    };
  }

  private resolveBucketKeyFromLink(link: string): string {
    try {
      const parsed = new URL(link);
      const path = parsed.pathname.replace(/^\/+/, '');
      if (!path) {
        return '';
      }

      const bucket = String(process.env.FILE_STORAGE_DEFAULT_BUCKET || '').trim().toLowerCase();
      const [firstSegment, ...rest] = path.split('/').filter(Boolean);

      if (bucket && firstSegment && firstSegment.toLowerCase() === bucket) {
        return rest.join('/');
      }

      return path;
    } catch {
      return link;
    }
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    return this.metadataService.updateById(id, payload);
  }

  async deleteById(id: number) {
    const row = await this.metadataService.getById(id);
    const fileName = typeof row?.fileName === 'string' ? row.fileName.trim() : '';
    if (fileName) {
      const storageSource = String(row?.storage_source || '').trim().toLowerCase();
      if (storageSource === 'bucket') {
        const link = typeof row?.link === 'string' ? row.link.trim() : '';
        const key = this.resolveBucketKeyFromLink(link);
        if (key) {
          await this.storageService.deleteStoredFileInBucket(key);
        }

        return this.metadataService.deleteById(id);
      }

      const subFolder = this.resolveDeleteSubFolder(row as Record<string, unknown>);
      await this.storageService.deleteStoredFile(fileName, subFolder);
    }

    return this.metadataService.deleteById(id);
  }

  private resolveDeleteSubFolder(row: Record<string, unknown>): string {
    // Try explicit subFolder first
    const explicitSubFolder = typeof row?.subFolder === 'string' ? row.subFolder.trim() : '';
    if (explicitSubFolder) {
      return explicitSubFolder;
    }

    // Fall back to extracting from link if available
    const link = typeof row?.link === 'string' ? row.link.trim() : '';
    if (link) {
      const parsed = link.match(/\/(?:uploads|attachments)\/([^?#]+)\/[^/?#]+(?:[?#].*)?$/i);
      const folder = parsed?.[1] || '';
      const normalized = folder
        .split('/')
        .filter(Boolean)
        .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ''))
        .filter(Boolean)
        .join('/');

      if (normalized) {
        return normalized;
      }
    }

    // Default to general
    return 'general';
  }

  private normalizeCreatePayload(
    payload: Record<string, unknown>,
    storedFileName: string,
    originalName?: string,
    bucketKey?: string | null,
    storageSourceOverride?: 'local' | 'bucket',
    subFolder?: string,
    userIdFromContext?: number,
  ): Record<string, unknown> {
    const createdDate = this.normalizeCreatedDate(payload.createdDate);
    const uniqueId = payload.uniqueId ?? payload.uniqueData;
    const ext = this.normalizeExtension(payload.ext, originalName);
    const link = this.normalizeLink(payload.link, storedFileName, subFolder || 'general', bucketKey);
    const createdByFromPayload = Number(payload.createdBy ?? payload.created_by);
    const createdBy = Number.isInteger(createdByFromPayload) && createdByFromPayload > 0
      ? createdByFromPayload
      : Number.isInteger(userIdFromContext) && Number(userIdFromContext) > 0
        ? Number(userIdFromContext)
        : undefined;

    return {
      ...payload,
      fileName: storedFileName,
      createdDate,
      uniqueId,
      link,
      ext,
      createdBy,
      storage_source: storageSourceOverride || this.normalizeStorageSource(payload.storage_source) || 'local',
    };
  }

  private normalizeStorageSource(value: unknown): 'local' | 'legacy' | 'bucket' | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === 'local' || normalized === 'legacy' || normalized === 'bucket') {
      return normalized;
    }

    if (normalized === 's3') {
      return 'bucket';
    }

    return undefined;
  }

  private normalizeCreatedDate(value: unknown): string {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  private normalizeExtension(value: unknown, originalName?: string): string | undefined {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (!originalName) {
      return undefined;
    }

    const extension = extname(originalName).replace('.', '').trim();
    return extension || undefined;
  }

  private normalizeLink(value: unknown, fileName: string, subFolder: string, bucketKey?: string | null): string | undefined {
    if (typeof bucketKey === 'string' && bucketKey.trim()) {
      return bucketKey.trim();
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return this.storageService.resolveLink(fileName, subFolder) || undefined;
  }


  /**
   * Generic: Add attachment metadata for a feature
   * @param feature Feature identifier
   * @param mainId Entity ID
   * @param dto Attachment data (file_name, file_url, etc.)
   * @returns Created attachment
   */
  async addAttachmentByFeature(
    feature: string,
    mainId: number,
    dto: Record<string, any>,
  ): Promise<any> {
    if (!dto.file_name || !dto.file_url) {
      throw new BadRequestException('file_name and file_url are required');
    }

    const attachmentId = await this.repository.createAttachment({
      fileName: dto.file_name,
      link: dto.file_url,
      field: feature,
      mainId,
      createdBy: dto.created_by,
      createdDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      ...dto,
    });

    return this.repository.getById(attachmentId);
  }

  /**
   * Generic: Delete attachment by ID
   * @param attachmentId Attachment ID
   */
  async deleteAttachmentByFeature(attachmentId: number): Promise<void> {
    const attachment = await this.repository.getById(attachmentId);

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Delete from S3 if stored there
    if (attachment.link && attachment.storage_source === 'bucket') {
      try {
        await this.s3UploadService.deleteFile(
          attachment.link,
          attachment.storage_bucket,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to delete S3 file for attachment ${attachmentId}: ${(error as Error)?.message}`,
        );
      }
    }

    await this.repository.deleteById(attachmentId);
  }
}

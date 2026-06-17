import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { extname } from 'node:path';
import { AttachmentsMetadataService } from './attachments-metadata.service';
import { FileStorageService } from '@/nest/modules/file-storage/file-storage.service';

interface CreateAttachmentPayload extends Record<string, unknown> {
  createdBy?: number | string;
  createdDate?: string;
  uniqueId?: number | string;
  uniqueData?: number | string;
  ext?: string;
  link?: string;
  storage_source?: string;
  subFolder?: string;
  folderName?: string;
}

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly metadataService: AttachmentsMetadataService,
    private readonly storageService: FileStorageService,
  ) {}

  async create(
    payload: CreateAttachmentPayload,
    currentUserId: number,
    file?: { originalname?: string; buffer?: Buffer },
  ) {
    const subFolder = this.resolveRequestedSubFolder(payload);
    if (!subFolder) {
      throw new BadRequestException('subFolder (or folderName) is required for attachment uploads');
    }

    const shouldUseBucket = this.shouldUseBucketStorageForPayload(payload);

    const stored = shouldUseBucket
      ? await this.storageService.storeUploadedFileInBucket(file, {
          keyPrefix: this.resolveBucketKeyPrefix(payload),
        })
      : null;

    const storedFileName = stored?.fileName || (await this.storageService.storeUploadedFile(file, subFolder));
    const normalizedPayload = this.normalizeCreatePayload(
      payload,
      storedFileName,
      currentUserId,
      file?.originalname,
      stored ? { key: stored.key, bucket: stored.bucket } : undefined,
    );

    try {
      const insertId = await this.metadataService.createAttachment(normalizedPayload);

      return { message: 'Created successfully', insertId };
    } catch (error) {
      if (stored?.key) {
        await this.storageService.deleteStoredFileInBucket(stored.key);
      } else {
        await this.storageService.deleteStoredFile(storedFileName, subFolder);
      }
      throw error;
    }
  }

  async uploadToFolder(
    file?: { originalname?: string; buffer?: Buffer },
    folder?: string,
  ) {
    const subFolder = this.resolveGenericSubFolder(folder);
    const storedFileName = await this.storageService.storeUploadedFile(file, subFolder);
    const url = this.storageService.resolveLink(storedFileName, subFolder);

    return {
      success: true,
      fileName: storedFileName,
      url,
      subFolder,
    };
  }

  private resolveSubFolder(payload: Record<string, unknown>): string {
    const explicitSubFolder = this.resolveRequestedSubFolder(payload);
    if (explicitSubFolder) {
      return explicitSubFolder;
    }

    return 'general';
  }

  private resolveRequestedSubFolder(payload: Record<string, unknown>): string {
    const subFolder = typeof payload?.subFolder === 'string' ? payload.subFolder.trim() : '';
    const folderName = typeof payload?.folderName === 'string' ? payload.folderName.trim() : '';
    const requested = subFolder || folderName;

    if (!requested) {
      return '';
    }

    return this.resolveGenericSubFolder(requested);
  }

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
    return Promise.all(rows.map((row) => this.resolveAttachmentForResponse(row)));
  }

  async find(filters: Record<string, string>) {
    const rows = await this.metadataService.find(filters);
    return Promise.all(rows.map((row) => this.resolveAttachmentForResponse(row)));
  }

  async getAllRelatedAttachments(id: number) {
    const rows = await this.metadataService.getAllRelatedAttachments(id);
    return Promise.all(rows.map((row) => this.resolveAttachmentForResponse(row)));
  }

  async getViewById(id: number) {
    const row = await this.metadataService.getById(id);
    if (!row) {
      throw new NotFoundException('Attachment not found');
    }

    const storageSource = this.normalizeStorageSource(row?.storage_source);
    if (storageSource === 'bucket') {
      const resolvedBucketKey = this.resolveBucketKeyFromRow(row as Record<string, unknown>);
      if (!resolvedBucketKey) {
        throw new NotFoundException('Attachment URL not available');
      }

      const bucketKey: string = resolvedBucketKey;

      const bucket = this.resolveBucketNameFromRow(row as Record<string, unknown>);
      const url = await this.storageService.resolveBucketObjectUrl(bucket, bucketKey);

      return {
        id,
        url,
        fileName: row?.fileName,
        storage_source: 'bucket',
      };
    }

    const resolved = await this.storageService.withResolvedLink(row as Record<string, unknown>);
    const link = typeof resolved?.link === 'string' ? resolved.link.trim() : '';
    if (!link) {
      throw new NotFoundException('Attachment URL not available');
    }

    return {
      id,
      url: link,
      fileName: resolved?.fileName,
      storage_source: resolved?.storage_source,
    };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    return this.metadataService.updateById(id, payload);
  }

  async deleteById(id: number) {
    const row = await this.metadataService.getById(id);
    const storageSource = this.normalizeStorageSource(row?.storage_source);
    const fileName = typeof row?.fileName === 'string' ? row.fileName.trim() : '';
    if (fileName) {
      if (storageSource === 'bucket') {
        const resolvedBucketKey = this.resolveBucketKeyFromRow(row as Record<string, unknown>);
        if (resolvedBucketKey) {
          const bucketKey: string = resolvedBucketKey;
          const bucket = this.resolveBucketNameFromRow(row as Record<string, unknown>);
          await this.storageService.deleteStoredFileInBucket(bucketKey, bucket);
        }
      } else {
        const subFolder = this.resolveDeleteSubFolder(row as Record<string, unknown>);
        await this.storageService.deleteStoredFile(fileName, subFolder);
      }
    }

    return this.metadataService.deleteById(id);
  }

  private shouldUseBucketStorageForPayload(payload: Record<string, unknown>): boolean {
    const requestedSubFolder = this.resolveRequestedSubFolder(payload);
    if (!requestedSubFolder || requestedSubFolder === 'general') {
      return false;
    }

    const mode = String(process.env.MEDIA_STORAGE_MODE || '').trim().toLowerCase();
    const bucket = String(process.env.MEDIA_STORAGE_BUCKET || '').trim();

    if (mode === 'local') {
      return false;
    }

    return mode === 'bucket' || mode === 's3' || !!bucket;
  }

  private resolveBucketKeyPrefix(payload: Record<string, unknown>): string {
    const requestedSubFolder = this.resolveRequestedSubFolder(payload);
    if (!requestedSubFolder) {
      throw new BadRequestException('subFolder (or folderName) is required for bucket uploads');
    }

    const subFolder = requestedSubFolder;
    const uniqueId = String(payload?.uniqueId ?? payload?.uniqueData ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '');

    return uniqueId ? `${subFolder}/${uniqueId}` : subFolder;
  }

  private async resolveAttachmentForResponse<T extends Record<string, unknown>>(row: T): Promise<T> {
    const storageSource = this.normalizeStorageSource(row?.storage_source);
    if (storageSource !== 'bucket') {
      return this.storageService.withResolvedLink(row);
    }

    const key = this.resolveBucketKeyFromRow(row);
    const bucket = this.resolveBucketNameFromRow(row);
    if (!key || !bucket) {
      return this.storageService.withResolvedLink(row);
    }

    try {
      const signedUrl = await this.storageService.resolveBucketObjectUrl(bucket, key);
      return {
        ...row,
        link: signedUrl,
        storage_source: 'bucket',
        storage_bucket: bucket,
        storage_key: key,
      };
    } catch {
      return this.storageService.withResolvedLink(row);
    }
  }

  private resolveBucketKeyFromRow(row: Record<string, unknown>): string | null {
    const explicitKey = typeof row?.storage_key === 'string' ? row.storage_key.trim() : '';
    if (explicitKey) {
      return explicitKey;
    }

    const link = String(row?.link || '').trim();
    if (!link) {
      return null;
    }

    const noQuery = link.split('?')[0].split('#')[0] || link;
    const marker = '/attachments/';
    const markerIndex = noQuery.indexOf(marker);
    if (markerIndex < 0) {
      return null;
    }

    const keyWithOptionalBucket = noQuery.slice(markerIndex + marker.length).replace(/^\/+/, '');
    if (!keyWithOptionalBucket) {
      return null;
    }

    const configuredBucket = String(process.env.MEDIA_STORAGE_BUCKET || '').trim();
    const parts = keyWithOptionalBucket.split('/').filter(Boolean);
    if (!parts.length) {
      return null;
    }

    if (configuredBucket && parts[0] === configuredBucket && parts.length > 1) {
      return parts.slice(1).join('/');
    }

    return keyWithOptionalBucket;
  }

  private resolveBucketNameFromRow(row: Record<string, unknown>): string {
    const explicitBucket = typeof row?.storage_bucket === 'string' ? row.storage_bucket.trim() : '';
    if (explicitBucket) {
      return explicitBucket;
    }

    const link = typeof row?.link === 'string' ? row.link.trim() : '';
    return this.resolveBucketNameFromLink(link);
  }

  private resolveBucketNameFromLink(link: string): string {
    const configuredBucket = String(process.env.MEDIA_STORAGE_BUCKET || '').trim();
    if (!link) {
      return configuredBucket;
    }

    const noQuery = link.split('?')[0].split('#')[0] || link;
    const marker = '/attachments/';
    const markerIndex = noQuery.indexOf(marker);
    if (markerIndex < 0) {
      return configuredBucket;
    }

    const tail = noQuery.slice(markerIndex + marker.length).replace(/^\/+/, '');
    const parts = tail.split('/').filter(Boolean);
    if (!parts.length) {
      return configuredBucket;
    }

    if (configuredBucket && parts[0] === configuredBucket) {
      return configuredBucket;
    }

    if (parts[0]) {
      const bucketLikePrefix = parts[0].trim();
      if (bucketLikePrefix && bucketLikePrefix.includes('bucket')) {
        return bucketLikePrefix;
      }
    }

    return configuredBucket;
  }

  private resolveDeleteSubFolder(row: Record<string, unknown>): string {
    const explicitSubFolder = typeof row?.subFolder === 'string' ? row.subFolder.trim() : '';
    if (explicitSubFolder) {
      return explicitSubFolder;
    }

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

    return this.resolveSubFolder(row);
  }

  private normalizeCreatePayload(
    payload: CreateAttachmentPayload,
    storedFileName: string,
    currentUserId: number,
    originalName?: string,
    bucketMeta?: { key: string; bucket: string },
  ): Record<string, unknown> {
    const createdDate = this.normalizeCreatedDate(payload.createdDate);
    const uniqueId = payload.uniqueId ?? payload.uniqueData;
    const ext = this.normalizeExtension(payload.ext, originalName);
    const subFolder = this.resolveSubFolder(payload);
    const createdBy = this.normalizeCreatedBy(payload.createdBy, currentUserId);
    const link = bucketMeta?.key
      ? this.normalizeBucketLink(bucketMeta.key)
      : this.normalizeLink(payload.link, storedFileName, subFolder);

    return {
      ...payload,
      fileName: storedFileName,
      createdBy,
      createdDate,
      uniqueId,
      link,
      ext,
      storage_source: bucketMeta?.key
        ? 'bucket'
        : this.normalizeStorageSource(payload.storage_source) || 'local',
      storage_bucket: bucketMeta?.bucket || undefined,
      storage_key: bucketMeta?.key || undefined,
    };
  }

  private normalizeCreatedBy(payloadCreatedBy: unknown, currentUserId: number): number {
    const fromPayload = Number(payloadCreatedBy);
    if (Number.isInteger(fromPayload) && fromPayload > 0) {
      return fromPayload;
    }

    if (Number.isInteger(currentUserId) && currentUserId > 0) {
      return currentUserId;
    }

    throw new BadRequestException('createdBy could not be resolved from authenticated user context');
  }

  private normalizeStorageSource(value: unknown): 'local' | 'legacy' | 'bucket' | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === 's3') {
      return 'bucket';
    }

    if (normalized === 'local' || normalized === 'legacy' || normalized === 'bucket') {
      return normalized;
    }

    return undefined;
  }

  private normalizeBucketLink(key: string): string {
    const normalizedKey = key
      .trim()
      .replace(/^\/+/, '')
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return `/attachments/${normalizedKey}`;
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

  private normalizeLink(value: unknown, fileName: string, subFolder: string): string | undefined {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return this.storageService.resolveLink(fileName, subFolder) || undefined;
  }
}

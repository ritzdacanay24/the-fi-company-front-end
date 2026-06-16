import { Injectable, NotFoundException } from '@nestjs/common';
import { extname } from 'node:path';
import { AttachmentsMetadataService } from './attachments-metadata.service';
import { FileStorageService } from '@/nest/modules/file-storage/file-storage.service';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly metadataService: AttachmentsMetadataService,
    private readonly storageService: FileStorageService,
  ) {}

  async create(
    payload: Record<string, unknown>,
    file?: { originalname?: string; buffer?: Buffer },
  ) {
    const subFolder = this.resolveSubFolder(payload);
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
      file?.originalname,
      stored ? { key: stored.key } : undefined,
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
    const explicitSubFolder = typeof payload?.subFolder === 'string' ? payload.subFolder.trim() : '';
    if (explicitSubFolder) {
      return explicitSubFolder;
    }

    const field = typeof payload?.field === 'string' ? payload.field.toLowerCase() : '';
    if (field.includes('field service')) {
      return 'fieldService';
    }
    if (field.includes('shipping checklist') || field.includes('shippingchecklist')) {
      return 'shippingChecklist';
    }
    if (field.includes('capa')) {
      return 'capa';
    }

    return 'general';
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
    return Promise.all(rows.map((row) => this.storageService.withResolvedLink(row)));
  }

  async find(filters: Record<string, string>) {
    const rows = await this.metadataService.find(filters);
    return Promise.all(rows.map((row) => this.storageService.withResolvedLink(row)));
  }

  async getAllRelatedAttachments(id: number) {
    const rows = await this.metadataService.getAllRelatedAttachments(id);
    return Promise.all(rows.map((row) => this.storageService.withResolvedLink(row)));
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

      const bucket: string = String(process.env.MEDIA_STORAGE_BUCKET || '').trim();
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
          const bucket: string = String(process.env.MEDIA_STORAGE_BUCKET || '').trim();
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
    if (!this.isVehicleAttachment(payload)) {
      return false;
    }

    const mode = String(process.env.MEDIA_STORAGE_MODE || '').trim().toLowerCase();
    const bucket = String(process.env.MEDIA_STORAGE_BUCKET || '').trim();

    if (mode === 'local') {
      return false;
    }

    return mode === 'bucket' || mode === 's3' || !!bucket;
  }

  private isVehicleAttachment(payload: Record<string, unknown>): boolean {
    const field = String(payload?.field || '')
      .trim()
      .toLowerCase();

    return field.includes('vehicle information') || field.includes('vehicle inspection');
  }

  private resolveBucketKeyPrefix(payload: Record<string, unknown>): string {
    const uniqueId = String(payload?.uniqueId ?? payload?.uniqueData ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '');

    // Keep vehicle uploads under the existing legacy-compatible S3 folder.
    const base = 'vehicleInformation';
    return uniqueId ? `${base}/${uniqueId}` : base;
  }

  private resolveBucketKeyFromRow(row: Record<string, unknown>): string | null {
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
    payload: Record<string, unknown>,
    storedFileName: string,
    originalName?: string,
    bucketMeta?: { key: string },
  ): Record<string, unknown> {
    const createdDate = this.normalizeCreatedDate(payload.createdDate);
    const uniqueId = payload.uniqueId ?? payload.uniqueData;
    const ext = this.normalizeExtension(payload.ext, originalName);
    const subFolder = this.resolveSubFolder(payload);
    const link = bucketMeta?.key
      ? this.normalizeBucketLink(bucketMeta.key)
      : this.normalizeLink(payload.link, storedFileName, subFolder);

    return {
      ...payload,
      fileName: storedFileName,
      createdDate,
      uniqueId,
      link,
      ext,
      storage_source: bucketMeta?.key
        ? 'bucket'
        : this.normalizeStorageSource(payload.storage_source) || 'local',
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

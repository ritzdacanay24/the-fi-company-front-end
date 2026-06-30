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
    const isBucketMode = this.storageService.isS3Mode();
    let storedFileName = '';
    let bucketKey: string | null = null;

    if (isBucketMode) {
      const stored = await this.storageService.storeUploadedFileInBucket(file, { keyPrefix: subFolder });
      storedFileName = stored.fileName;
      bucketKey = stored.key;
    } else {
      storedFileName = await this.storageService.storeUploadedFile(file, subFolder);
    }

    const normalizedPayload = this.normalizeCreatePayload(
      payload,
      storedFileName,
      file?.originalname,
      bucketKey,
      isBucketMode ? 'bucket' : 'local',
    );

    try {
      const insertId = await this.metadataService.createAttachment(normalizedPayload);

      return { message: 'Created successfully', insertId };
    } catch (error) {
      if (isBucketMode && bucketKey) {
        await this.storageService.deleteStoredFileInBucket(bucketKey);
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

    const resolved = await this.storageService.withResolvedLink(row as Record<string, unknown>);
    const link = typeof resolved?.link === 'string' ? resolved.link.trim() : '';
    const storageSource = String(resolved?.storage_source || '').trim().toLowerCase();
    if (!link) {
      throw new NotFoundException('Attachment URL not available');
    }

    const url = storageSource === 'bucket'
      ? await this.storageService.resolveBucketObjectUrl('', this.resolveBucketKeyFromLink(link))
      : link;

    return {
      id,
      url,
      fileName: resolved?.fileName,
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
    bucketKey?: string | null,
    storageSourceOverride?: 'local' | 'bucket',
  ): Record<string, unknown> {
    const createdDate = this.normalizeCreatedDate(payload.createdDate);
    const uniqueId = payload.uniqueId ?? payload.uniqueData;
    const ext = this.normalizeExtension(payload.ext, originalName);
    const subFolder = this.resolveSubFolder(payload);
    const link = this.normalizeLink(payload.link, storedFileName, subFolder, bucketKey);

    return {
      ...payload,
      fileName: storedFileName,
      createdDate,
      uniqueId,
      link,
      ext,
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
}

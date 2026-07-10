import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { extname } from 'node:path';
import { FileStorageService } from '../file-storage/file-storage.service';
import {
  CreateResourcePayload,
  ResourceRow,
  ResourcesRepository,
  UpdateResourcePayload,
} from './resources.repository';

export type ResourceDto = {
  id: number;
  category: string;
  title: string;
  description: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  icon: string;
  color: string;
  sort_order: number;
  active: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class ResourcesService {
  constructor(
    private readonly repository: ResourcesRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async list(activeOnly = true): Promise<ResourceDto[]> {
    const rows = await this.repository.list(activeOnly);
    return rows.map((row) => this.toDto(row));
  }

  async getSignedUrl(id: number, mode: 'inline' | 'attachment' = 'inline') {
    const row = await this.repository.findById(id);
    if (!row || !row.active) {
      throw new NotFoundException('Resource not found');
    }

    const bucketSignedUrl = await this.resolveBucketSignedUrl(row);
    const baseUrl = this.fileStorageService.resolveLink(row.file_name, 'resources');
    const fallbackUrl = row.link || '';
    const url = (bucketSignedUrl || baseUrl || fallbackUrl || '').trim();

    if (!url) {
      throw new NotFoundException('Resource URL not available');
    }

    return {
      id: row.id,
      url,
      mode,
      fileName: row.file_name,
    };
  }

  async resolveDownloadTarget(id: number): Promise<{ filePath: string; displayName: string; mimeType: string } | null> {
    const row = await this.repository.findById(id);
    if (!row || !row.active) {
      throw new NotFoundException('Resource not found');
    }

    const filePath = await this.fileStorageService.resolveLocalFilePath(row.file_name, 'resources');
    if (!filePath) {
      return null;
    }

    return {
      filePath,
      displayName: row.file_name,
      mimeType: row.mime_type || 'application/octet-stream',
    };
  }

  async create(
    payload: Record<string, unknown>,
    file: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number } | undefined,
    currentUserId: number,
  ) {
    const normalized = await this.normalizeCreatePayload(payload, file, currentUserId);
    const insertId = await this.repository.create(normalized);
    const row = await this.repository.findById(insertId);

    if (!row) {
      throw new NotFoundException('Failed to load created resource');
    }

    return this.toDto(row);
  }

  async update(
    id: number,
    payload: Record<string, unknown>,
    file: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number } | undefined,
  ) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Resource not found');
    }

    const normalized = await this.normalizeUpdatePayload(payload, file, existing);
    await this.repository.update(id, normalized);

    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException('Resource not found after update');
    }

    return this.toDto(row);
  }

  private async normalizeCreatePayload(
    payload: Record<string, unknown>,
    file: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number } | undefined,
    currentUserId: number,
  ): Promise<CreateResourcePayload> {
    const category = String(payload.category || '').trim();
    const title = String(payload.title || '').trim();
    const description = String(payload.description || '').trim();

    if (!category || !title) {
      throw new BadRequestException('category and title are required');
    }

    const createdByName = String(payload.created_by_name || payload.createdByName || '').trim() || null;
    const normalizedActive = this.parseBooleanLike(payload.active);

    const stored = await this.storeFile(file);

    return {
      category,
      title,
      description: description || null,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      link: stored.link,
      storageSource: stored.storageSource,
      storageBucket: stored.storageBucket,
      storageKey: stored.storageKey,
      icon: this.resolveIcon(String(payload.icon || ''), stored.fileName),
      color: String(payload.color || '#dc3545'),
      sortOrder: Number(payload.sort_order || payload.sortOrder || 0),
      active: normalizedActive === undefined ? 1 : normalizedActive ? 1 : 0,
      createdBy: currentUserId,
      createdByName,
    };
  }

  private async normalizeUpdatePayload(
    payload: Record<string, unknown>,
    file: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number } | undefined,
    existing: ResourceRow,
  ): Promise<UpdateResourcePayload> {
    const normalizedActive = this.parseBooleanLike(payload.active);

    const result: UpdateResourcePayload = {
      category: payload.category === undefined ? undefined : String(payload.category || '').trim(),
      title: payload.title === undefined ? undefined : String(payload.title || '').trim(),
      description: payload.description === undefined ? undefined : String(payload.description || '').trim(),
      icon: payload.icon === undefined ? undefined : String(payload.icon || '').trim(),
      color: payload.color === undefined ? undefined : String(payload.color || '').trim(),
      sortOrder:
        payload.sort_order === undefined && payload.sortOrder === undefined
          ? undefined
          : Number(payload.sort_order ?? payload.sortOrder ?? 0),
      active: normalizedActive === undefined ? undefined : normalizedActive ? 1 : 0,
    };

    if (file) {
      const stored = await this.storeFile(file);
      result.fileName = stored.fileName;
      result.mimeType = stored.mimeType;
      result.sizeBytes = stored.sizeBytes;
      result.link = stored.link;
      result.storageSource = stored.storageSource;
      result.storageBucket = stored.storageBucket;
      result.storageKey = stored.storageKey;

      if (existing.storage_source === 'bucket') {
        const existingKey = String(existing.storage_key || '').trim() || this.resolveBucketKey(existing);
        if (existingKey) {
          await this.fileStorageService.deleteStoredFileInBucket(existingKey, String(existing.storage_bucket || '').trim() || undefined);
        }
      } else if (existing.file_name) {
        await this.fileStorageService.deleteStoredFile(existing.file_name, 'resources');
      }
    }

    return result;
  }

  private async storeFile(file?: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number }) {
    if (!file?.originalname || !file?.buffer) {
      throw new BadRequestException('File is required');
    }

    const ext = extname(file.originalname).toLowerCase();
    if (this.fileStorageService.isS3Mode()) {
      const stored = await this.fileStorageService.storeUploadedFileInBucket(file, { keyPrefix: 'resources' });

      return {
        fileName: stored.fileName,
        mimeType: file.mimetype || this.getMimeTypeFromExtension(ext),
        sizeBytes: Number(file.size || 0),
        // Store bucket key so we can sign on-demand in getSignedUrl.
        link: stored.key,
        storageSource: 'bucket',
        storageBucket: stored.bucket,
        storageKey: stored.key,
      };
    }

    const fileName = await this.fileStorageService.storeUploadedFile(file, 'resources');

    return {
      fileName,
      mimeType: file.mimetype || this.getMimeTypeFromExtension(ext),
      sizeBytes: Number(file.size || 0),
      link: this.fileStorageService.resolveLink(fileName, 'resources') || '',
      storageSource: 'local',
      storageBucket: null,
      storageKey: null,
    };
  }

  private async resolveBucketSignedUrl(row: ResourceRow): Promise<string> {
    const storageSource = String(row?.storage_source || '').trim().toLowerCase();
    if (storageSource && storageSource !== 'bucket') {
      return '';
    }

    const defaultBucket = String(process.env.FILE_STORAGE_DEFAULT_BUCKET || '').trim();
    if (!defaultBucket) {
      return '';
    }

    if (!storageSource && !this.isLikelyBucketBackedLink(String(row?.link || ''))) {
      return '';
    }

    const explicitBucket = String(row?.storage_bucket || '').trim();
    const bucket = explicitBucket || defaultBucket;

    const key = this.resolveBucketKey(row);
    if (!key) {
      return '';
    }

    try {
      return await this.fileStorageService.resolveBucketObjectUrl(bucket, key);
    } catch {
      return '';
    }
  }

  private resolveBucketKey(row: ResourceRow): string {
    const explicitKey = String(row?.storage_key || '').trim();
    if (explicitKey) {
      return this.normalizePotentialBucketKey(explicitKey);
    }

    const rawLink = String(row?.link || '').trim();
    if (!rawLink) {
      return '';
    }

    if (!/^https?:\/\//i.test(rawLink)) {
      // Treat non-absolute links as bucket keys (legacy/current behavior for bucket mode).
      return this.normalizePotentialBucketKey(rawLink);
    }

    try {
      const parsed = new URL(rawLink);
      const path = parsed.pathname.replace(/^\/+/, '');
      if (!path) {
        return '';
      }

      const defaultBucket = String(process.env.FILE_STORAGE_DEFAULT_BUCKET || '').trim().toLowerCase();
      const [firstSegment, ...rest] = path.split('/').filter(Boolean);

      if (defaultBucket && firstSegment && firstSegment.toLowerCase() === defaultBucket) {
        return this.normalizePotentialBucketKey(rest.join('/'));
      }

      return this.normalizePotentialBucketKey(path);
    } catch {
      return '';
    }
  }

  private isLikelyBucketBackedLink(link: string): boolean {
    const raw = String(link || '').trim();
    if (!raw) {
      return false;
    }

    // Relative local links should never be treated as S3 keys.
    if (raw.startsWith('/')) {
      return false;
    }

    // Non-URL values are usually raw storage keys from bucket mode.
    if (!/^https?:\/\//i.test(raw)) {
      return true;
    }

    try {
      const parsed = new URL(raw);
      const host = String(parsed.host || '').toLowerCase();
      const endpointHost = String(process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '');

      if (host.includes('amazonaws.com')) {
        return true;
      }

      if (endpointHost && host === endpointHost) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private normalizePotentialBucketKey(rawKey: string): string {
    const normalized = String(rawKey || '').trim().replace(/^\/+/, '');
    if (!normalized) {
      return '';
    }

    // Legacy links sometimes persisted as attachments/resources/... or uploads/resources/...
    return normalized.replace(/^(attachments|uploads)\//i, '').trim();
  }

  private getMimeTypeFromExtension(ext: string): string {
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.doc':
        return 'application/msword';
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.xls':
        return 'application/vnd.ms-excel';
      case '.xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case '.ppt':
        return 'application/vnd.ms-powerpoint';
      case '.pptx':
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case '.txt':
        return 'text/plain';
      case '.csv':
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }

  private resolveIcon(explicitIcon: string, fileName: string): string {
    if (explicitIcon.trim()) {
      return explicitIcon.trim();
    }

    const ext = extname(fileName).toLowerCase();
    if (ext === '.doc' || ext === '.docx') {
      return 'ri-file-word-line';
    }

    if (ext === '.xls' || ext === '.xlsx') {
      return 'ri-file-excel-line';
    }

    if (ext === '.ppt' || ext === '.pptx') {
      return 'ri-file-ppt-line';
    }

    if (ext === '.txt' || ext === '.csv') {
      return 'ri-file-text-line';
    }

    return 'ri-file-line';
  }

  private parseBooleanLike(value: unknown): boolean | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    const normalized = String(value).trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
      return true;
    }

    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
      return false;
    }

    return true;
  }

  private toDto(row: ResourceRow): ResourceDto {
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      description: row.description || '',
      file_name: row.file_name,
      mime_type: row.mime_type || 'application/octet-stream',
      size_bytes: Number(row.size_bytes || 0),
      icon: row.icon || this.resolveIcon('', row.file_name),
      color: row.color || '#dc3545',
      sort_order: Number(row.sort_order || 0),
      active: Number(row.active || 0),
      created_by_name: row.created_by_name || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

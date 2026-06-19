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
  private static readonly ALLOWED_EXTENSIONS = new Set([
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.txt',
    '.csv',
  ]);

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

    if (!row.file_name) {
      throw new NotFoundException('Resource URL not available');
    }

    const localFilePath = await this.fileStorageService.resolveLocalFilePath(row.file_name, 'resources');
    const storedLink = String(row.link || '').trim();

    let url = '';
    if (localFilePath) {
      // Legacy/local resource: keep existing behavior intact.
      url = storedLink || this.fileStorageService.resolveLink(row.file_name, 'resources') || '';
    } else {
      // Bucket-backed resource: generate a presigned URL for private-bucket access.
      try {
        url = await this.fileStorageService.resolveBucketObjectUrl(undefined, `resources/${row.file_name}`);
      } catch {
        // Fallback keeps behavior for non-standard legacy rows with external links.
        url = storedLink;
      }
    }

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

  async resolveDownloadTarget(
    id: number,
  ): Promise<{ filePath?: string; url?: string; displayName: string; mimeType: string } | null> {
    const row = await this.repository.findById(id);
    if (!row || !row.active) {
      throw new NotFoundException('Resource not found');
    }

    const localFilePath = await this.fileStorageService.resolveLocalFilePath(row.file_name, 'resources');
    if (localFilePath) {
      return {
        filePath: localFilePath,
        displayName: row.file_name,
        mimeType: row.mime_type || 'application/octet-stream',
      };
    }

    let url = '';
    try {
      url = await this.fileStorageService.resolveBucketObjectUrl(undefined, `resources/${row.file_name}`);
    } catch {
      url = String(row.link || '').trim();
    }

    if (!url) {
      return null;
    }

    return {
      url,
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

  async remove(id: number): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Resource not found');
    }

    if (existing.file_name) {
      const localFilePath = await this.fileStorageService.resolveLocalFilePath(existing.file_name, 'resources');
      if (localFilePath) {
        await this.fileStorageService.deleteStoredFile(existing.file_name, 'resources');
      } else {
        await this.fileStorageService.deleteStoredFileInBucket(`resources/${existing.file_name}`);
      }
    }

    await this.repository.update(id, { active: 0 });
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

    const stored = await this.storeFile(file);

    return {
      category,
      title,
      description: description || null,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      link: stored.link,
      icon: this.resolveIcon(String(payload.icon || ''), stored.fileName),
      color: String(payload.color || '#dc3545'),
      sortOrder: Number(payload.sort_order || payload.sortOrder || 0),
      active: Number(payload.active === undefined ? 1 : payload.active ? 1 : 0),
      createdBy: currentUserId,
      createdByName,
    };
  }

  private async normalizeUpdatePayload(
    payload: Record<string, unknown>,
    file: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number } | undefined,
    existing: ResourceRow,
  ): Promise<UpdateResourcePayload> {
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
      active: payload.active === undefined ? undefined : (payload.active ? 1 : 0),
    };

    if (file) {
      const stored = await this.storeFile(file);
      result.fileName = stored.fileName;
      result.mimeType = stored.mimeType;
      result.sizeBytes = stored.sizeBytes;
      result.link = stored.link;

      if (existing.file_name) {
        await this.fileStorageService.deleteStoredFileInBucket(`resources/${existing.file_name}`);
      }
    }

    return result;
  }

  private async storeFile(file?: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number }) {
    if (!file?.originalname || !file?.buffer) {
      throw new BadRequestException('File is required');
    }

    const ext = extname(file.originalname).toLowerCase();
    if (!ResourcesService.ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('Unsupported file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV');
    }

    const mimeType = file.mimetype || this.getMimeTypeFromExtension(ext);

    const stored = await this.fileStorageService.storeUploadedFileInBucket(
      { ...file, mimetype: mimeType },
      { keyPrefix: 'resources' },
    );

    return {
      fileName: stored.fileName,
      mimeType,
      sizeBytes: Number(file.size || 0),
      link: stored.url,
    };
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

    return 'ri-file-pdf-line';
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

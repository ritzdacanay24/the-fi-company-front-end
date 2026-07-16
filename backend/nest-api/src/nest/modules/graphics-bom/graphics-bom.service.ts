import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { GraphicsBomRepository } from './graphics-bom.repository';
import { FileStorageService } from '../file-storage/file-storage.service';
import { FeatureType } from '@/shared/enums/feature.enum';

@Injectable()
export class GraphicsBomService {
  constructor(
    private readonly repository: GraphicsBomRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async getList(): Promise<RowDataPacket[]> {
    const rows = await this.repository.getList();
    return this.withImageUrls(rows);
  }

  async find(filters: Record<string, unknown>) {
    const rows = await this.repository.find(filters);
    return this.withImageUrls(rows);
  }

  async getAll() {
    const rows = await this.repository.getAll();
    return this.withImageUrls(rows);
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_GRAPHICS_BOM_NOT_FOUND',
        message: `Graphics BOM with id ${id} not found`,
      });
    }

    const imageUrl = await this.resolveImageUrl(row as Record<string, unknown>);
    return {
      ...row,
      Image_Url: imageUrl,
    };
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    return { insertId };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const rowCount = await this.repository.updateById(id, payload);
    return { rowCount };
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }

  async upload(file?: { originalname?: string; buffer: Buffer }) {
    if (!file?.originalname || !file?.buffer) {
      return { answer: 'No files' };
    }

    const subFolder = FeatureType.GRAPHICS_BOM;
    if (this.fileStorageService.isS3Mode()) {
      const stored = await this.fileStorageService.storeUploadedFileInBucket(file, {
        keyPrefix: subFolder,
      });
      const signedUrl = await this.fileStorageService.resolveBucketObjectUrl(stored.bucket, stored.key);

      return {
        answer: 'File transfer completed',
        fileName: stored.fileName,
        url: signedUrl,
        key: stored.key,
        bucket: stored.bucket,
        storageSource: 'bucket',
      };
    }

    const fileName = await this.fileStorageService.storeUploadedFile(file, subFolder);
    const url = this.fileStorageService.resolveLink(fileName, subFolder) || `/attachments/${subFolder}/${encodeURIComponent(fileName)}`;

    return {
      answer: 'File transfer completed',
      fileName,
      url,
      storageSource: 'local',
    };
  }

  private async resolveImageUrl(row: Record<string, unknown>): Promise<string | null> {
    const storedValue = String(row?.Image_Data || '').trim();
    if (!storedValue) {
      return null;
    }

    if (/^https?:\/\//i.test(storedValue)) {
      return storedValue;
    }

    const storageSource = String(row?.image_storage_source || '').trim().toLowerCase();
    if (this.fileStorageService.isS3Mode() && storageSource === 'bucket') {
      const explicitKey = String(row?.image_storage_key || '').trim();
      const explicitBucket = String(row?.image_storage_bucket || '').trim() || undefined;
      const resolvedKey = this.resolveBucketKeyForRow(storedValue, explicitKey);
      if (!resolvedKey) {
        return null;
      }

      try {
        return await this.fileStorageService.resolveBucketObjectUrl(explicitBucket, resolvedKey);
      } catch {
        return null;
      }
    }

    const graphicsBomPath = await this.fileStorageService.resolveLocalFilePath(storedValue, FeatureType.GRAPHICS_BOM);
    if (graphicsBomPath) {
      return this.fileStorageService.resolveLink(storedValue, FeatureType.GRAPHICS_BOM);
    }

    const legacyGraphicsPath = await this.fileStorageService.resolveLocalFilePath(storedValue, 'graphics');
    if (legacyGraphicsPath) {
      return this.fileStorageService.resolveLink(storedValue, 'graphics');
    }

    return null;
  }

  private async withImageUrls(rows: RowDataPacket[]): Promise<RowDataPacket[]> {
    return Promise.all(
      (rows || []).map(async (row) => ({
        ...row,
        Image_Url: await this.resolveImageUrl(row as Record<string, unknown>),
      })),
    );
  }

  private resolveBucketKeyForRow(imageData: string, explicitKey: string): string {
    const safeImageData = String(imageData || '').trim();
    const safeExplicitKey = String(explicitKey || '').trim();

    if (!safeImageData) {
      return '';
    }

    if (safeImageData.includes('/')) {
      return safeImageData;
    }

    if (!safeExplicitKey) {
      return `${FeatureType.GRAPHICS_BOM}/${safeImageData}`;
    }

    const lastSlashIndex = safeExplicitKey.lastIndexOf('/');
    const explicitFileName = lastSlashIndex >= 0
      ? safeExplicitKey.slice(lastSlashIndex + 1)
      : safeExplicitKey;

    if (explicitFileName.toLowerCase() === safeImageData.toLowerCase()) {
      return safeExplicitKey;
    }

    const explicitFolder = lastSlashIndex >= 0
      ? safeExplicitKey.slice(0, lastSlashIndex)
      : '';

    if (explicitFolder) {
      return `${explicitFolder}/${safeImageData}`;
    }

    return `${FeatureType.GRAPHICS_BOM}/${safeImageData}`;
  }
}

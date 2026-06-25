import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { GraphicsBomRepository } from './graphics-bom.repository';
import { FileStorageService } from '../file-storage/file-storage.service';

/** Legacy URL base for images uploaded before S3 migration */
const GRAPHICS_BOM_LEGACY_BASE_URL = 'https://dashboard.eye-fi.com/attachments_mount/Yellowfish/';

@Injectable()
export class GraphicsBomService {
  constructor(
    private readonly repository: GraphicsBomRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async getList(): Promise<RowDataPacket[]> {
    const rows = await this.repository.getList();
    return rows.map((r) => this.withListImageUrl(r));
  }

  async find(filters: Record<string, unknown>) {
    const rows = await this.repository.find(filters);
    return rows.map((r) => this.withListImageUrl(r));
  }

  async getAll() {
    const rows = await this.repository.getAll();
    return rows.map((r) => this.withListImageUrl(r));
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_GRAPHICS_BOM_NOT_FOUND',
        message: `Graphics BOM with id ${id} not found`,
      });
    }
    return this.withResolvedImageUrl(row);
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    return { insertId };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.repository.getById(id);
    const rowCount = await this.repository.updateById(id, payload);
    return { rowCount };
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }

  async deleteImage(id: number) {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({ code: 'RC_GRAPHICS_BOM_NOT_FOUND', message: `Graphics BOM with id ${id} not found` });
    }

    const source = row['image_storage_source'] as string | null;
    const bucket = row['image_storage_bucket'] as string | null;
    const key = row['image_storage_key'] as string | null;

    // Delete from S3 if stored there
    if (source === 'bucket' && key) {
      await this.fileStorageService.deleteStoredFileInBucket(key, bucket || undefined);
    }

    await this.repository.updateById(id, {
      Image_Data: null,
      image_storage_source: null,
      image_storage_bucket: null,
      image_storage_key: null,
    });

    return { message: 'Image removed' };
  }

  async upload(
    file?: { originalname?: string; buffer: Buffer; mimetype?: string },
    options?: { previousKey?: string; previousBucket?: string },
  ) {
    if (!file?.originalname || !file?.buffer) {
      return { answer: 'No files' };
    }

    const isS3 = this.fileStorageService.isS3Mode();

    // Delete the previous S3 object before uploading the replacement
    if (isS3 && options?.previousKey) {
      await this.fileStorageService.deleteStoredFileInBucket(
        options.previousKey,
        options.previousBucket || undefined,
      );
    }

    if (isS3) {
      const stored = await this.fileStorageService.storeUploadedFileInBucket(file, {
        keyPrefix: 'graphics-bom',
      });

      return {
        answer: 'File transfer completed',
        fileName: stored.fileName,
        url: stored.url,
        imageStorageSource: 'bucket' as const,
        imageStorageBucket: stored.bucket,
        imageStorageKey: stored.key,
      };
    }

    const subFolder = 'graphics';
    const fileName = await this.fileStorageService.storeUploadedFile(file, subFolder);
    const url = this.fileStorageService.resolveLink(fileName, subFolder) || `/attachments/${subFolder}/${encodeURIComponent(fileName)}`;

    return {
      answer: 'File transfer completed',
      fileName,
      url,
      imageStorageSource: 'local' as const,
      imageStorageBucket: null,
      imageStorageKey: null,
    };
  }

  /**
   * Synchronous image URL for list views — no signing, uses unsigned S3 URL for thumbnails.
   * Detail/modal views use withResolvedImageUrl() which signs the URL.
   */
  private withListImageUrl(row: Record<string, unknown>): Record<string, unknown> {
    const source = row['image_storage_source'] as string | null;
    const bucket = row['image_storage_bucket'] as string | null;
    const key = row['image_storage_key'] as string | null;
    const imageData = row['Image_Data'] as string | null;

    let imageUrl: string | null = null;

    if (source === 'bucket' && bucket && key) {
      // Unsigned public URL — fine for internal thumbnail display
      const s3Base = String(process.env.FILE_STORAGE_S3_PUBLIC_BASE_URL || 'https://s3.us-west-1.amazonaws.com').replace(/\/+$/, '');
      imageUrl = `${s3Base}/${bucket}/${key}`;
    } else if (source === 'local' && imageData) {
      imageUrl = this.fileStorageService.resolveLink(imageData, 'graphics')
        || `/attachments/graphics/${encodeURIComponent(imageData)}`;
    } else if (imageData) {
      imageUrl = `${GRAPHICS_BOM_LEGACY_BASE_URL}${imageData}`;
    }

    return { ...row, image_url: imageUrl };
  }

  /**
   * Enriches a graphicsInventory row with a resolved `image_url`:
   * - S3 bucket: generates a signed/public URL via FileStorageService
   * - Local: NestJS-served attachment URL
   * - Legacy (null storage_source): falls back to the pre-migration Yellowfish path
   */
  private async withResolvedImageUrl(row: RowDataPacket): Promise<RowDataPacket> {
    const source = row['image_storage_source'] as string | null;
    const bucket = row['image_storage_bucket'] as string | null;
    const key = row['image_storage_key'] as string | null;
    const imageData = row['Image_Data'] as string | null;

    let imageUrl: string | null = null;

    if (source === 'bucket' && bucket && key) {
      imageUrl = await this.fileStorageService.resolveBucketObjectUrl(bucket, key);
    } else if (source === 'local' && imageData) {
      imageUrl = this.fileStorageService.resolveLink(imageData, 'graphics')
        || `/attachments/graphics/${encodeURIComponent(imageData)}`;
    } else if (imageData) {
      // Legacy records: no storage_source set, use pre-migration URL
      imageUrl = `${GRAPHICS_BOM_LEGACY_BASE_URL}${imageData}`;
    }

    return { ...row, image_url: imageUrl };
  }
}


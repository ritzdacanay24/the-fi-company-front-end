import { BadRequestException, Body, Controller, Delete, Get, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileStorageService } from './file-storage.service';

@Controller('file-storage')
@UseGuards(RolePermissionGuard)
export class FileStorageController {
  constructor(private readonly service: FileStorageService) {}

  @Get('bucket/list')
  @Permissions('read')
  async listBucket(
    @Query('prefix') prefix?: string,
    @Query('delimiter') delimiter?: string,
    @Query('continuationToken') continuationToken?: string,
    @Query('maxKeys') maxKeys?: string,
  ) {
    const parsedMaxKeys = Number(maxKeys || 100);
    return this.service.listBucketObjects({
      prefix,
      delimiter,
      continuationToken,
      maxKeys: Number.isFinite(parsedMaxKeys) ? parsedMaxKeys : 100,
    });
  }

  @Get('bucket/signed-url')
  @Permissions('read')
  async getBucketSignedUrl(@Query('key') key?: string) {
    const safeKey = String(key || '').trim();
    if (!safeKey) {
      throw new BadRequestException('Missing bucket object key');
    }

    const url = await this.service.resolveBucketObjectUrl(undefined, safeKey);
    const fileName = decodeURIComponent(safeKey.split('/').filter(Boolean).pop() || 'file');

    return {
      key: safeKey,
      fileName,
      url,
    };
  }

  @Post('upload')
  @Permissions('write')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Body('folder') folder?: string,
    @Body('subFolder') subFolder?: string,
    @Body('storageMode') storageMode?: string,
    @UploadedFile() file?: { originalname?: string; mimetype?: string; buffer?: Buffer },
  ) {
    const targetFolder = folder || subFolder || 'general';
    const requestedStorageMode = String(storageMode || '').trim().toLowerCase();
    const forceServerStorage = requestedStorageMode === 'server';

    if (!forceServerStorage && this.shouldUseBucketStorage()) {
      const keyPrefix = this.normalizeFolder(targetFolder);
      const stored = await this.service.storeUploadedFileInBucket(file, {
        keyPrefix,
      });

      return {
        success: true,
        fileName: stored.fileName,
        subFolder: targetFolder,
        url: stored.url,
        bucket: stored.bucket,
        key: stored.key,
      };
    }

    const fileName = await this.service.storeUploadedFile(file, targetFolder);
    const url = this.service.resolveLink(fileName, targetFolder);

    return {
      success: true,
      fileName,
      subFolder: targetFolder,
      url,
    };
  }

  @Delete('delete')
  @Permissions('delete')
  async delete(
    @Body('image_url') imageUrl?: string,
    @Body('url') url?: string,
    @Body('fileName') fileName?: string,
    @Body('folder') folder?: string,
    @Body('subFolder') subFolder?: string,
  ) {
    const bucketTarget = this.resolveBucketDeleteTarget(imageUrl || url, fileName, folder || subFolder);
    if (bucketTarget) {
      await this.service.deleteStoredFileInBucket(bucketTarget.key, bucketTarget.bucket);

      return {
        success: true,
        fileName: bucketTarget.fileName,
        subFolder: bucketTarget.subFolder,
      };
    }

    const resolved = this.resolveDeleteTarget(imageUrl || url, fileName, folder || subFolder);
    if (!resolved) {
      throw new BadRequestException('Missing or invalid delete target');
    }

    await this.service.deleteStoredFile(resolved.fileName, resolved.subFolder);

    return {
      success: true,
      fileName: resolved.fileName,
      subFolder: resolved.subFolder,
    };
  }

  @Delete('bucket/object')
  @Permissions('delete')
  async deleteBucketObject(@Body('key') key?: string) {
    const safeKey = String(key || '').trim();
    if (!safeKey) {
      throw new BadRequestException('Missing bucket object key');
    }

    await this.service.deleteStoredFileInBucket(safeKey);

    return {
      success: true,
      key: safeKey,
    };
  }

  @Delete('bucket/prefix')
  @Permissions('delete')
  async deleteBucketPrefix(@Body('prefix') prefix?: string) {
    const safePrefix = String(prefix || '').trim();
    if (!safePrefix) {
      throw new BadRequestException('Missing bucket prefix');
    }

    const deleted = await this.service.deleteBucketPrefixIfEmpty(safePrefix);

    return {
      success: true,
      prefix: deleted.prefix,
    };
  }

  private resolveDeleteTarget(
    imageUrl?: string,
    explicitFileName?: string,
    explicitSubFolder?: string,
  ): { fileName: string; subFolder: string } | null {
    const fallbackFolder = this.normalizeFolder(explicitSubFolder || 'general');
    const normalizedFileName = this.normalizeFileName(explicitFileName || '');
    if (normalizedFileName) {
      return {
        fileName: normalizedFileName,
        subFolder: fallbackFolder,
      };
    }

    if (!imageUrl || !imageUrl.trim()) {
      return null;
    }

    const rawPath = this.extractPathname(imageUrl.trim());
    const parsedFromAttachments = this.parseFileFromPrefixedPath(rawPath, '/attachments/');
    if (parsedFromAttachments) {
      return parsedFromAttachments;
    }

    const parsedFromUploads = this.parseFileFromPrefixedPath(rawPath, '/uploads/');
    if (parsedFromUploads) {
      return parsedFromUploads;
    }

    const simpleFileName = this.normalizeFileName(rawPath.split('/').filter(Boolean).pop() || '');
    if (!simpleFileName) {
      return null;
    }

    return {
      fileName: simpleFileName,
      subFolder: fallbackFolder,
    };
  }

  private resolveBucketDeleteTarget(
    imageUrl?: string,
    explicitFileName?: string,
    explicitSubFolder?: string,
  ): { bucket: string; key: string; fileName: string; subFolder: string } | null {
    if (!this.shouldUseBucketStorage()) {
      return null;
    }

    const configuredBucket = String(process.env.FILE_STORAGE_DEFAULT_BUCKET || '').trim();
    if (!configuredBucket) {
      return null;
    }

    const normalizedFileName = this.normalizeFileName(explicitFileName || '');
    const normalizedSubFolder = this.normalizeFolder(explicitSubFolder || 'general');
    if (normalizedFileName) {
      const key = `${normalizedSubFolder}/${normalizedFileName}`.replace(/^\/+/, '');
      return {
        bucket: configuredBucket,
        key,
        fileName: normalizedFileName,
        subFolder: normalizedSubFolder,
      };
    }

    if (!imageUrl || !imageUrl.trim()) {
      return null;
    }

    const rawPath = this.extractPathname(imageUrl.trim());
    const attachmentsPrefix = '/attachments/';
    const attachmentsIndex = rawPath.indexOf(attachmentsPrefix);
    if (attachmentsIndex >= 0) {
      const keyFromAttachments = rawPath.slice(attachmentsIndex + attachmentsPrefix.length).replace(/^\/+/, '');
      const segments = keyFromAttachments.split('/').filter(Boolean);
      const derivedFileName = this.normalizeFileName(segments[segments.length - 1] || '');
      if (!derivedFileName || segments.length < 2) {
        return null;
      }

      return {
        bucket: configuredBucket,
        key: keyFromAttachments,
        fileName: derivedFileName,
        subFolder: this.normalizeFolder(segments.slice(0, -1).join('/')),
      };
    }

    try {
      const parsed = new URL(imageUrl);
      const pathSegments = decodeURIComponent(parsed.pathname || '')
        .split('/')
        .filter(Boolean);
      if (!pathSegments.length) {
        return null;
      }

      let bucket = configuredBucket;
      let keySegments = pathSegments;
      if (pathSegments[0] === configuredBucket) {
        keySegments = pathSegments.slice(1);
      }

      if (!keySegments.length) {
        return null;
      }

      const key = keySegments.join('/');
      const derivedFileName = this.normalizeFileName(keySegments[keySegments.length - 1] || '');
      if (!derivedFileName) {
        return null;
      }

      return {
        bucket,
        key,
        fileName: derivedFileName,
        subFolder: this.normalizeFolder(keySegments.slice(0, -1).join('/')),
      };
    } catch {
      return null;
    }
  }

  private shouldUseBucketStorage(): boolean {
    const mode = String(process.env.MEDIA_STORAGE_MODE || '').trim().toLowerCase();
    const bucket = String(process.env.FILE_STORAGE_DEFAULT_BUCKET || '').trim();

    if (mode === 'local') {
      return false;
    }

    return mode === 'bucket' || mode === 's3' || !!bucket;
  }

  private extractPathname(value: string): string {
    const noQuery = value.split('?')[0].split('#')[0] || value;
    try {
      if (/^https?:\/\//i.test(noQuery)) {
        return new URL(noQuery).pathname || '';
      }
    } catch {
      // Ignore malformed URL and continue best-effort parsing.
    }

    return noQuery;
  }

  private parseFileFromPrefixedPath(
    value: string,
    prefix: '/attachments/' | '/uploads/',
  ): { fileName: string; subFolder: string } | null {
    const markerIndex = value.indexOf(prefix);
    if (markerIndex < 0) {
      return null;
    }

    const tail = value.slice(markerIndex + prefix.length).replace(/^\/+/, '');
    const segments = tail.split('/').filter(Boolean);
    if (segments.length < 2) {
      return null;
    }

    const fileName = this.normalizeFileName(segments[segments.length - 1] || '');
    if (!fileName) {
      return null;
    }

    const subFolder = this.normalizeFolder(segments.slice(0, -1).join('/'));
    return {
      fileName,
      subFolder,
    };
  }

  private normalizeFolder(value: string): string {
    return value
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '') || 'general';
  }

  private normalizeFileName(value: string): string | null {
    const decoded = decodeURIComponent(value || '').trim();
    if (!decoded || decoded.includes('/') || decoded.includes('\\') || decoded === '.' || decoded === '..') {
      return null;
    }

    return decoded;
  }
}

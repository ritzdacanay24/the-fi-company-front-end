import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadRootDirs = this.resolveUploadRootDirs();
  private readonly publicRootBaseUrl = this.resolvePublicRootBaseUrl();
  private readonly s3Client = this.createS3Client();

  async storeUploadedFile(
    file?: { originalname?: string; buffer?: Buffer },
    subFolder = 'general',
  ): Promise<string> {
    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('File is required');
    }

    const storedFileName = this.buildStoredFileName(file.originalname);

    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'general');
    await this.writeFileToUploadTargets(storedFileName, file.buffer, safeSubFolder);
    return storedFileName;
  }

  async storeUploadedFileInBucket(
    file?: { originalname?: string; buffer?: Buffer; mimetype?: string },
    options?: { bucket?: string; keyPrefix?: string; fixedFileName?: string; preferUnsignedUrl?: boolean },
  ): Promise<{ bucket: string; key: string; fileName: string; url: string }> {
    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('File is required');
    }

    const bucket = this.resolveBucketName(options?.bucket);
    const keyPrefix = this.sanitizeKeyPrefix(options?.keyPrefix || '');
    const fileName = options?.fixedFileName || this.buildStoredFileName(file.originalname);
    const key = keyPrefix ? `${keyPrefix}/${fileName}` : fileName;
    const s3Client = this.requireS3Client();

    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    return {
      bucket,
      key,
      fileName,
      url: this.buildS3ObjectUrl(bucket, key),
    };
  }

  async resolveLocalFilePath(fileName: string, subFolder = 'general'): Promise<string | null> {
    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'general');
    const targetDirs = this.uploadRootDirs.map((rootDir) => join(rootDir, safeSubFolder));

    for (const uploadDir of targetDirs) {
      const filePath = join(uploadDir, fileName);
      try {
        await stat(filePath);
        return filePath;
      } catch {
        // Try next dir.
      }
    }

    return null;
  }

  async deleteStoredFile(fileName: string, subFolder = 'general'): Promise<void> {
    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'general');
    const targetDirs = this.uploadRootDirs.map((rootDir) => join(rootDir, safeSubFolder));

    await Promise.all(
      targetDirs.map(async (uploadDir) => {
        try {
          await unlink(join(uploadDir, fileName));
        } catch {
          // Best-effort cleanup.
        }
      }),
    );
  }

  async deleteStoredFileInBucket(key: string, bucket?: string): Promise<void> {
    const safeKey = this.sanitizeKeyPrefix(key);
    if (!safeKey) {
      return;
    }

    const bucketName = this.resolveBucketName(bucket);
    const s3Client = this.requireS3Client();

    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: safeKey,
      }));
    } catch {
      // Best-effort cleanup.
    }
  }

  async resolveBucketObjectUrl(bucket: string, key: string): Promise<string> {
    const bucketName = this.resolveBucketName(bucket);
    const safeKey = this.sanitizeKeyPrefix(key);
    if (!safeKey) {
      throw new BadRequestException('Bucket object key is required');
    }

    const s3Client = this.requireS3Client();

    try {
      return await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: bucketName,
          Key: safeKey,
        }),
        {
          expiresIn: this.resolveS3SignedUrlExpiresInSeconds(),
        },
      );
    } catch {
      this.logger.warn('Failed to generate signed S3 URL for object view. Falling back to unsigned URL.');
      return this.buildS3ObjectUrl(bucketName, safeKey);
    }
  }

  resolveLink(fileName: unknown, subFolder = 'general'): string | null {
    if (typeof fileName !== 'string' || !fileName) {
      return null;
    }

    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'general');
    const publicBaseUrl = `${this.publicRootBaseUrl}/${safeSubFolder}`;
    return `${publicBaseUrl}/${encodeURIComponent(fileName)}`;
  }

  async withResolvedLink<T extends Record<string, unknown>>(row: T): Promise<T> {
    const fileName = row?.fileName;
    const existingLink = typeof row?.link === 'string' ? row.link.trim() : '';
    const subFolder = this.resolveSubFolder(row);

    if (typeof fileName !== 'string' || !fileName) {
      return row;
    }

    const localLink = this.resolveLink(fileName, subFolder);
    const storageSource = String(row?.storage_source ?? row?.storageSource ?? '').trim().toLowerCase();

    if (storageSource === 'bucket') {
      return {
        ...row,
        link: existingLink || null,
        storage_source: 'bucket',
      };
    }

    return {
      ...row,
      link: localLink,
      storage_source: 'local',
    };
  }

  private async writeFileToUploadTargets(fileName: string, fileBuffer: Buffer, subFolder: string): Promise<void> {
    let writeSucceeded = false;
    const targetDirs = this.uploadRootDirs.map((rootDir) => join(rootDir, subFolder));

    for (const uploadDir of targetDirs) {
      try {
        await mkdir(uploadDir, { recursive: true });
        const filePath = join(uploadDir, fileName);
        await writeFile(filePath, fileBuffer);
        writeSucceeded = true;
      } catch {
        // Ignore individual target failures; require at least one successful write.
      }
    }

    if (!writeSucceeded) {
      throw new BadRequestException('Failed to store uploaded file');
    }
  }

  private buildStoredFileName(originalName: string): string {
    const safeOriginalName = this.sanitizeOriginalFileName(basename(originalName));
    const timestamp = Date.now();
    const uniqueSuffix = randomUUID().replace(/-/g, '');
    return `${timestamp}_${uniqueSuffix}_${safeOriginalName}`;
  }

  private sanitizeOriginalFileName(originalName: string): string {
    const trimmed = String(originalName || '').trim();
    if (!trimmed) {
      return 'upload.bin';
    }

    const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
    return sanitized || 'upload.bin';
  }

  private isS3Enabled(): boolean {
    const mode = String(process.env.MEDIA_STORAGE_MODE || '').trim().toLowerCase();
    if (mode === 'local') {
      return false;
    }

    return mode === 's3' || mode === 'bucket' || !!String(process.env.MEDIA_STORAGE_BUCKET || '').trim();
  }

  private requireS3Client(): S3Client {
    if (this.s3Client) {
      return this.s3Client;
    }

    throw new BadRequestException('Bucket storage is not enabled. Configure MEDIA_STORAGE_MODE as "s3" or "bucket" and set MEDIA_STORAGE_BUCKET.');
  }

  private createS3Client(): S3Client | null {
    if (!this.isS3Enabled()) {
      return null;
    }

    const region = this.resolveS3Region();
    const endpoint = this.resolveS3Endpoint();
    const forcePathStyle = this.resolveS3ForcePathStyle();
    const accessKeyId = String(process.env.AWS_ACCESS_KEY_ID || '').trim();
    const secretAccessKey = String(process.env.AWS_SECRET_ACCESS_KEY || '').trim();
    const sessionToken = String(process.env.AWS_SESSION_TOKEN || '').trim();
    const hasStaticCredentials = !!accessKeyId && !!secretAccessKey;

    this.logger.log(`Bucket storage provider: s3 (region=${region}, endpoint=${endpoint || 'aws-default'})`);

    return new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle,
      credentials: hasStaticCredentials
        ? {
            accessKeyId,
            secretAccessKey,
            sessionToken: sessionToken || undefined,
          }
        : undefined,
    });
  }

  private resolveS3Region(): string {
    return String(process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1').trim();
  }

  private resolveS3Endpoint(): string {
    return String(process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT || '').trim().replace(/\/+$/, '');
  }

  private resolveS3ForcePathStyle(): boolean {
    const raw = String(process.env.AWS_S3_FORCE_PATH_STYLE || '').trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
  }

  private resolveS3PublicBaseUrl(): string {
    return String(process.env.FILE_STORAGE_S3_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
  }

  private buildS3ObjectUrl(bucket: string, key: string): string {
    const encodedKey = key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    const publicBaseUrl = this.resolveS3PublicBaseUrl();
    if (publicBaseUrl) {
      return `${publicBaseUrl}/${bucket}/${encodedKey}`;
    }

    const endpoint = this.resolveS3Endpoint();
    if (endpoint) {
      return `${endpoint}/${bucket}/${encodedKey}`;
    }

    const region = this.resolveS3Region();
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  }

  private resolveS3SignedUrlExpiresInSeconds(): number {
    const raw = Number(process.env.FILE_STORAGE_S3_SIGNED_URL_EXPIRES_IN || 3600);
    if (!Number.isFinite(raw) || raw <= 0) {
      return 3600;
    }

    return Math.floor(raw);
  }

  private resolveBucketName(bucket?: string): string {
    const raw = bucket?.trim() || String(process.env.MEDIA_STORAGE_BUCKET || '').trim();
    if (!raw) {
      throw new BadRequestException('Missing MEDIA_STORAGE_BUCKET. Configure MEDIA_STORAGE_BUCKET for bucket-backed storage operations.');
    }

    return this.sanitizeBucketName(raw);
  }

  private sanitizeBucketName(bucket: string): string {
    const normalized = String(bucket || '').trim().toLowerCase();
    const safe = normalized.replace(/[^a-z0-9._-]/g, '');
    return safe || 'general';
  }

  private sanitizeKeyPrefix(keyPrefix: string): string {
    const normalized = String(keyPrefix || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    if (!normalized) {
      return '';
    }

    const segments = normalized.split('/').filter(Boolean);
    const safeSegments = segments
      .filter((segment) => segment !== '.' && segment !== '..')
      .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, ''))
      .filter(Boolean);

    return safeSegments.join('/');
  }

  private resolveUploadRootDirs(): string[] {
    const configuredRoots = process.env.ATTACHMENTS_UPLOAD_ROOT_DIRS
      ?.split(',')
      .map((dir) => dir.trim())
      .filter(Boolean);

    if (configuredRoots && configuredRoots.length > 0) {
      return configuredRoots;
    }

    return [join(process.cwd(), 'uploads')];
  }

  private resolvePublicRootBaseUrl(): string {
    const configuredRoot = process.env.ATTACHMENTS_PUBLIC_BASE_URL?.trim();
    if (configuredRoot) {
      return configuredRoot.replace(/\/+$/, '');
    }

    return '/uploads';
  }

  private sanitizeSubFolder(subFolder: string, fallback: string): string {
    if (!subFolder || typeof subFolder !== 'string') {
      return fallback;
    }

    const normalized = subFolder
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    if (!normalized) {
      return fallback;
    }

    const segments = normalized.split('/').filter(Boolean);
    if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
      return fallback;
    }

    const safeSegments = segments.map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ''));
    const safe = safeSegments.filter(Boolean).join('/');
    return safe || fallback;
  }

  private resolveSubFolder(row: Record<string, unknown>): string {
    // Source of truth: frontend/payload should provide subFolder.
    const explicitSubFolder = typeof row?.subFolder === 'string' ? row.subFolder.trim() : '';
    if (explicitSubFolder) {
      return this.sanitizeSubFolder(explicitSubFolder, 'general');
    }

    // Fallback for existing rows that were saved without subFolder metadata.
    const storageKey = typeof row?.storage_key === 'string' ? row.storage_key.trim() : '';
    if (storageKey) {
      const firstSegment = storageKey.split('/').find(Boolean) || '';
      if (firstSegment) {
        return this.sanitizeSubFolder(firstSegment, 'general');
      }
    }

    const link = typeof row?.link === 'string' ? row.link.trim() : '';
    if (link) {
      const matched = link.match(/\/(?:uploads|attachments)\/([^/?#]+)/i);
      if (matched?.[1]) {
        return this.sanitizeSubFolder(matched[1], 'general');
      }
    }

    return 'general';
  }

}

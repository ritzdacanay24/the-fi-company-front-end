import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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

    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
      }));
    } catch (err) {
      this.logger.error(`S3 upload failed for key="${key}" bucket="${bucket}": ${(err as Error)?.message}`, (err as Error)?.stack);
      throw err;
    }

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

  async listBucketObjects(options?: {
    bucket?: string;
    prefix?: string;
    delimiter?: string;
    continuationToken?: string;
    maxKeys?: number;
  }): Promise<{ bucket: string; prefix: string; delimiter: string; nextContinuationToken?: string; prefixes: string[]; items: Array<{ key: string; size: number; lastModified?: string; url: string }> }> {
    const bucketName = this.resolveBucketName(options?.bucket);
    const s3Client = this.requireS3Client();
    const rawPrefix = String(options?.prefix || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
    const sanitizedPrefix = this.sanitizeKeyPrefix(rawPrefix);
    const prefix = sanitizedPrefix
      ? (rawPrefix.endsWith('/') ? `${sanitizedPrefix}/` : sanitizedPrefix)
      : '';
    const delimiterRaw = options?.delimiter;
    const delimiter = delimiterRaw === undefined ? '/' : String(delimiterRaw).trim();
    const maxKeysRaw = Number(options?.maxKeys || 100);
    const maxKeys = Number.isFinite(maxKeysRaw) ? Math.min(Math.max(Math.floor(maxKeysRaw), 1), 500) : 100;

    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix || undefined,
      Delimiter: delimiter || undefined,
      ContinuationToken: options?.continuationToken || undefined,
      MaxKeys: maxKeys,
    }));

    const prefixes = (response.CommonPrefixes || [])
      .map((row) => String(row.Prefix || '').trim())
      .filter(Boolean);

    const items = (response.Contents || [])
      .filter((row) => !!row.Key)
      .map((row) => {
        const key = String(row.Key || '');
        return {
          key,
          size: Number(row.Size || 0),
          lastModified: row.LastModified ? row.LastModified.toISOString() : undefined,
          url: this.buildS3ObjectUrl(bucketName, key),
        };
      });

    return {
      bucket: bucketName,
      prefix,
      delimiter,
      nextContinuationToken: response.NextContinuationToken || undefined,
      prefixes,
      items,
    };
  }

  async deleteBucketPrefixIfEmpty(prefix: string, bucket?: string): Promise<{ bucket: string; prefix: string; deleted: boolean }> {
    const bucketName = this.resolveBucketName(bucket);
    const s3Client = this.requireS3Client();

    const rawPrefix = String(prefix || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    const sanitizedPrefix = this.sanitizeKeyPrefix(rawPrefix);
    if (!sanitizedPrefix) {
      throw new BadRequestException('Missing bucket prefix');
    }

    const normalizedPrefix = `${sanitizedPrefix}/`;

    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: normalizedPrefix,
      MaxKeys: 25,
    }));

    const hasNonMarkerObjects = (response.Contents || []).some((row) => {
      const key = String(row.Key || '').trim();
      return !!key && key !== normalizedPrefix;
    });

    if (hasNonMarkerObjects) {
      throw new BadRequestException('Folder is not empty. Delete files first.');
    }

    // Remove optional S3 folder marker objects if present.
    await Promise.all([
      this.deleteStoredFileInBucket(normalizedPrefix, bucketName),
      this.deleteStoredFileInBucket(sanitizedPrefix, bucketName),
    ]);

    return {
      bucket: bucketName,
      prefix: normalizedPrefix,
      deleted: true,
    };
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

    return mode === 's3' || mode === 'bucket' || !!String(process.env.FILE_STORAGE_DEFAULT_BUCKET || '').trim();
  }

  /** Public accessor — lets callers check whether S3 is the active storage mode. */
  isS3Mode(): boolean {
    return this.isS3Enabled();
  }

  private requireS3Client(): S3Client {
    if (this.s3Client) {
      return this.s3Client;
    }

    throw new BadRequestException('Bucket storage is not enabled. Configure MEDIA_STORAGE_MODE as "s3" or "bucket" and set FILE_STORAGE_DEFAULT_BUCKET.');
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
    const raw = bucket?.trim() || String(process.env.FILE_STORAGE_DEFAULT_BUCKET || '').trim();
    if (!raw) {
      throw new BadRequestException('Missing FILE_STORAGE_DEFAULT_BUCKET. Configure FILE_STORAGE_DEFAULT_BUCKET for bucket-backed storage operations.');
    }

    return this.sanitizeBucketName(raw);
  }

  private sanitizeBucketName(bucket: string): string {
    const normalized = String(bucket || '').trim().toLowerCase();
    const safe = normalized.replace(/[^a-z0-9._-]/g, '');
    if (!safe) {
      throw new BadRequestException(`Invalid bucket name "${bucket}": must contain at least one valid character (a-z, 0-9, ., -, _).`);
    }
    return safe;
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

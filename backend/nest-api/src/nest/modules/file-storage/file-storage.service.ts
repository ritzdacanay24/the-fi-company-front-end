import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly explicitUploadDirs = this.resolveExplicitUploadDirs();
  private readonly uploadRootDirs = this.resolveUploadRootDirs();
  private readonly explicitPublicBaseUrl = this.resolveExplicitPublicBaseUrl();
  private readonly publicRootBaseUrl = this.resolvePublicRootBaseUrl();
  private readonly remoteBaseUrl = this.resolveRemoteBaseUrl();
  private readonly bucketProvider = this.resolveBucketProvider();
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

    const bucketProvider = this.resolveBucketProviderRequired();
    if (bucketProvider === 's3' && this.s3Client) {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));

      return {
        bucket,
        key,
        fileName,
        url: await this.buildS3ObjectUrl(bucket, key, {
          preferUnsignedUrl: !!options?.preferUnsignedUrl,
        }),
      };
    }

    const bucketRootDir = this.resolveBucketRootDir();
    const absoluteFilePath = join(bucketRootDir, bucket, key);
    await mkdir(dirname(absoluteFilePath), { recursive: true });
    await writeFile(absoluteFilePath, file.buffer);

    const publicBase = this.resolveBucketPublicBaseUrl();
    const encodedKey = key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    const url = `${publicBase}/${bucket}/${encodedKey}`;

    return {
      bucket,
      key,
      fileName,
      url,
    };
  }

  async resolveLocalFilePath(fileName: string, subFolder = 'general'): Promise<string | null> {
    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'general');
    const targetDirs = this.getUploadTargetDirs(safeSubFolder);

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
    const targetDirs = this.getUploadTargetDirs(safeSubFolder);

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

    const bucketProvider = this.resolveBucketProviderRequired();
    if (bucketProvider === 's3' && this.s3Client) {
      try {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: bucketName,
          Key: safeKey,
        }));
      } catch {
        // Best-effort cleanup.
      }
      return;
    }

    const absolutePath = join(this.resolveBucketRootDir(), bucketName, safeKey);

    try {
      await unlink(absolutePath);
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

    const bucketProvider = this.resolveBucketProviderRequired();
    if (bucketProvider === 's3') {
      return this.buildS3ObjectUrl(bucketName, safeKey);
    }

    const publicBase = this.resolveBucketPublicBaseUrl();
    const encodedKey = safeKey.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    return `${publicBase}/${bucketName}/${encodedKey}`;
  }

  resolveLink(fileName: unknown, subFolder = 'general'): string | null {
    if (typeof fileName !== 'string' || !fileName) {
      return null;
    }

    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'general');
    const publicBaseUrl = this.getPublicBaseUrl(safeSubFolder);
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
    const fileExistsLocally = await this.fileExistsInUploadTargets(fileName, subFolder);
    const storageSource = this.resolveStorageSource(row, fileExistsLocally);

    if (storageSource === 'bucket') {
      return {
        ...row,
        link: existingLink || null,
        storage_source: 'bucket',
      };
    }

    if (storageSource === 'local' && localLink) {
      return {
        ...row,
        link: localLink,
        storage_source: 'local',
      };
    }

    // If file doesn't exist locally, it's a non-local attachment
    // Always resolve to dashboard URL regardless of storage_source value
    if (!fileExistsLocally) {
      return {
        ...row,
        link: this.buildRemoteFileUrl(subFolder, fileName),
        storage_source: storageSource ?? 'legacy',
      };
    }

    // File exists locally but storage_source isn't 'local'
    if (existingLink) {
      return {
        ...row,
        link: this.normalizeExistingLink(existingLink, fileName, subFolder),
        storage_source: row?.storage_source ?? row?.storageSource ?? null,
      };
    }

    return {
      ...row,
      storage_source: row?.storage_source ?? row?.storageSource ?? null,
    };
  }

  private async fileExistsInUploadTargets(fileName: string, subFolder: string): Promise<boolean> {
    const targetDirs = this.getUploadTargetDirs(subFolder);

    for (const uploadDir of targetDirs) {
      try {
        await stat(join(uploadDir, fileName));
        return true;
      } catch {
        // Continue checking next upload directory.
      }
    }

    return false;
  }

  private async writeFileToUploadTargets(fileName: string, fileBuffer: Buffer, subFolder: string): Promise<void> {
    let writeSucceeded = false;
    const targetDirs = this.getUploadTargetDirs(subFolder);

    for (const uploadDir of targetDirs) {
      try {
        await mkdir(uploadDir, { recursive: true });
        const filePath = join(uploadDir, fileName);
        await writeFile(filePath, fileBuffer);

        const fileStats = await stat(filePath);
        if (fileStats.size > 0) {
          writeSucceeded = true;
        }
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

  private resolveBucketRootDir(): string {
    const configured = process.env.FILE_STORAGE_BUCKET_ROOT_DIR?.trim();
    if (configured) {
      return configured;
    }

    return this.uploadRootDirs[0] || join(process.cwd(), 'uploads');
  }

  private resolveBucketProvider(): 'local' | 's3' | null {
    const configured = String(process.env.MEDIA_STORAGE_MODE || '').trim().toLowerCase();
    if (configured === 's3' || configured === 'bucket') {
      return 's3';
    }

    if (configured === 'local') {
      return 'local';
    }

    // Allow explicit bucket configuration to drive provider selection for bucket-only flows.
    const configuredBucket = String(process.env.MEDIA_STORAGE_BUCKET || '').trim();
    if (configuredBucket) {
      return 's3';
    }

    return null;
  }

  private resolveBucketProviderRequired(): 'local' | 's3' {
    const provider = this.resolveBucketProvider();
    if (!provider) {
      throw new BadRequestException('Missing MEDIA_STORAGE_MODE. Configure MEDIA_STORAGE_MODE as "local", "s3", or "bucket".');
    }

    if (provider === 's3' || provider === 'local') {
      return provider;
    }

    throw new BadRequestException('Invalid MEDIA_STORAGE_MODE. Expected "local", "s3", or "bucket".');
  }

  private createS3Client(): S3Client | null {
    if (this.bucketProvider !== 's3') {
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

  private async buildS3ObjectUrl(
    bucket: string,
    key: string,
    options?: { preferUnsignedUrl?: boolean },
  ): Promise<string> {
    const encodedKey = key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    const publicBaseUrl = this.resolveS3PublicBaseUrl();
    if (publicBaseUrl) {
      return `${publicBaseUrl}/${bucket}/${encodedKey}`;
    }

    if (options?.preferUnsignedUrl) {
      const endpoint = this.resolveS3Endpoint();
      if (endpoint) {
        return `${endpoint}/${bucket}/${encodedKey}`;
      }

      const region = this.resolveS3Region();
      return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
    }

    if (this.s3Client) {
      try {
        return await getSignedUrl(
          this.s3Client,
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
          {
            expiresIn: this.resolveS3SignedUrlExpiresInSeconds(),
          },
        );
      } catch {
        this.logger.warn('Failed to generate signed S3 URL. Falling back to unsigned object URL.');
      }
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

  private resolveBucketPublicBaseUrl(): string {
    const configured = process.env.FILE_STORAGE_BUCKET_PUBLIC_BASE_URL?.trim();
    if (configured) {
      return configured.replace(/\/+$/, '');
    }

    return '/attachments';
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

  private resolveExplicitUploadDirs(): string[] {
    const configured = process.env.ATTACHMENTS_FS_UPLOAD_DIRS
      ?.split(',')
      .map((dir) => dir.trim())
      .filter(Boolean);

    return configured && configured.length > 0 ? configured : [];
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

  private resolveExplicitPublicBaseUrl(): string {
    const configured = process.env.ATTACHMENTS_FS_PUBLIC_BASE_URL?.trim();
    if (configured) {
      return configured.replace(/\/+$/, '');
    }

    return '';
  }

  private resolvePublicRootBaseUrl(): string {
    const configuredRoot = process.env.ATTACHMENTS_PUBLIC_BASE_URL?.trim();
    if (configuredRoot) {
      return configuredRoot.replace(/\/+$/, '');
    }

    return '/uploads';
  }

  private resolveRemoteBaseUrl(): string {
    const configured = process.env.ATTACHMENTS_FS_REMOTE_BASE_URL?.trim();
    if (configured) {
      return configured.replace(/\/+$/, '');
    }

    return 'https://dashboard.eye-fi.com/attachments';
  }

  private getUploadTargetDirs(subFolder: string): string[] {
    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'general');
    if (this.explicitUploadDirs.length > 0) {
      return this.explicitUploadDirs;
    }

    return this.uploadRootDirs.map((rootDir) => join(rootDir, safeSubFolder));
  }

  private getPublicBaseUrl(subFolder: string): string {
    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'general');
    if (this.explicitPublicBaseUrl) {
      return this.explicitPublicBaseUrl;
    }

    return `${this.publicRootBaseUrl}/${safeSubFolder}`;
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
    const explicitSubFolder = typeof row?.subFolder === 'string' ? row.subFolder.trim() : '';
    if (explicitSubFolder) {
      return explicitSubFolder;
    }

    const field = typeof row?.field === 'string' ? row.field.toLowerCase() : '';
    if (field.includes('field service')) {
      return 'fieldService';
    }

    if (field.includes('vehicle inspection')) {
      return 'vehicleInformation';
    }

    if (field.includes('vehicle information')) {
      return 'vehicleInformation';
    }

    if (field.includes('shippingrequest') || field.includes('shipping request')) {
      return 'shippingRequest';
    }

    if (field.includes('shipping checklist') || field.includes('shippingchecklist')) {
      return 'shippingChecklist';
    }

    if (field.includes('safety incident')) {
      return 'safetyIncident';
    }

    if (
      field.includes('capa request') ||
      field.includes('capa') ||
      field.includes('qir') ||
      field.includes('quality incident')
    ) {
      return 'capa';
    }

    return 'general';
  }

  private normalizeExistingLink(existingLink: string, fileName: string, subFolder: string): string {
    if (!existingLink) {
      return this.buildRemoteFileUrl(subFolder, fileName);
    }

    if (/^https?:\/\//i.test(existingLink)) {
      return existingLink;
    }

    // For any non-absolute URL, force dashboard URL resolution
    // This ensures legacy/non-local sources always resolve properly
    return this.buildRemoteFileUrl(subFolder, fileName);
  }

  private buildRemoteFileUrl(subFolder: string, fileName: string): string {
    const normalizedSubFolder = String(subFolder || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    const safeSegments = normalizedSubFolder
      .split('/')
      .filter((segment) => segment && segment !== '.' && segment !== '..')
      .map((segment) => encodeURIComponent(segment));

    const encodedSubFolder = safeSegments.length > 0 ? safeSegments.join('/') : 'general';
    return `${this.remoteBaseUrl}/${encodedSubFolder}/${encodeURIComponent(fileName)}`;
  }

  private resolveStorageSource(
    row: Record<string, unknown>,
    fileExistsLocally: boolean,
  ): 'local' | 'legacy' | 'bucket' | null {
    const fromRow = this.parseStorageSource(row?.storage_source ?? row?.storageSource);
    if (fromRow) {
      return fromRow;
    }

    if (fileExistsLocally) {
      return 'local';
    }

    return null;
  }

  private parseStorageSource(value: unknown): 'local' | 'legacy' | 'bucket' | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === 'local' || normalized === 'legacy' || normalized === 'bucket') {
      return normalized;
    }

    return null;
  }
}

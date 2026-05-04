import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

@Injectable()
export class FileStorageService {
  private readonly explicitUploadDirs = this.resolveExplicitUploadDirs();
  private readonly uploadRootDirs = this.resolveUploadRootDirs();
  private readonly explicitPublicBaseUrl = this.resolveExplicitPublicBaseUrl();
  private readonly publicRootBaseUrl = this.resolvePublicRootBaseUrl();
  private readonly remoteBaseUrl = this.resolveRemoteBaseUrl();

  async storeUploadedFile(
    file?: { originalname?: string; buffer?: Buffer },
    subFolder = 'fieldService',
  ): Promise<string> {
    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('File is required');
    }

    const storedFileName = this.buildStoredFileName(file.originalname);

    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'fieldService');
    await this.writeFileToUploadTargets(storedFileName, file.buffer, safeSubFolder);
    return storedFileName;
  }

  async storeUploadedFileInBucket(
    file?: { originalname?: string; buffer?: Buffer },
    options?: { bucket?: string; keyPrefix?: string },
  ): Promise<{ bucket: string; key: string; fileName: string; url: string }> {
    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('File is required');
    }

    const bucket = this.resolveBucketName(options?.bucket);
    const keyPrefix = this.sanitizeKeyPrefix(options?.keyPrefix || '');
    const fileName = this.buildStoredFileName(file.originalname);
    const key = keyPrefix ? `${keyPrefix}/${fileName}` : fileName;

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

  async deleteStoredFile(fileName: string, subFolder = 'fieldService'): Promise<void> {
    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'fieldService');
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
    const absolutePath = join(this.resolveBucketRootDir(), bucketName, safeKey);

    try {
      await unlink(absolutePath);
    } catch {
      // Best-effort cleanup.
    }
  }

  resolveLink(fileName: unknown, subFolder = 'fieldService'): string | null {
    if (typeof fileName !== 'string' || !fileName) {
      return null;
    }

    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'fieldService');
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
        link: `${this.remoteBaseUrl}/${subFolder}/${encodeURIComponent(fileName)}`,
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
    const safeOriginalName = basename(originalName);
    return `${Date.now()}_${safeOriginalName}`;
  }

  private resolveBucketRootDir(): string {
    const configured = process.env.FILE_STORAGE_BUCKET_ROOT_DIR?.trim();
    if (configured) {
      return configured;
    }

    return this.uploadRootDirs[0] || join(process.cwd(), 'uploads');
  }

  private resolveBucketPublicBaseUrl(): string {
    const configured = process.env.FILE_STORAGE_BUCKET_PUBLIC_BASE_URL?.trim();
    if (configured) {
      return configured.replace(/\/+$/, '');
    }

    return '/attachments';
  }

  private resolveBucketName(bucket?: string): string {
    const fallback = process.env.FILE_STORAGE_DEFAULT_BUCKET?.trim() || 'general';
    const raw = bucket && bucket.trim() ? bucket.trim() : fallback;
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
    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'fieldService');
    if (this.explicitUploadDirs.length > 0) {
      return this.explicitUploadDirs;
    }

    return this.uploadRootDirs.map((rootDir) => join(rootDir, safeSubFolder));
  }

  private getPublicBaseUrl(subFolder: string): string {
    const safeSubFolder = this.sanitizeSubFolder(subFolder, 'fieldService');
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

    return 'fieldService';
  }

  private normalizeExistingLink(existingLink: string, fileName: string, subFolder: string): string {
    if (!existingLink) {
      return `${this.remoteBaseUrl}/${subFolder}/${encodeURIComponent(fileName)}`;
    }

    if (/^https?:\/\//i.test(existingLink)) {
      return existingLink;
    }

    // For any non-absolute URL, force dashboard URL resolution
    // This ensures legacy/non-local sources always resolve properly
    return `${this.remoteBaseUrl}/${subFolder}/${encodeURIComponent(fileName)}`;
  }

  private resolveStorageSource(
    row: Record<string, unknown>,
    fileExistsLocally: boolean,
  ): 'local' | 'legacy' | null {
    const fromRow = this.parseStorageSource(row?.storage_source ?? row?.storageSource);
    if (fromRow) {
      return fromRow;
    }

    if (fileExistsLocally) {
      return 'local';
    }

    return null;
  }

  private parseStorageSource(value: unknown): 'local' | 'legacy' | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === 'local' || normalized === 'legacy') {
      return normalized;
    }

    return null;
  }
}

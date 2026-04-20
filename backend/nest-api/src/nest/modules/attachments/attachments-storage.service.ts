import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

@Injectable()
export class AttachmentsStorageService {
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

    const safeOriginalName = basename(file.originalname);
    const storedFileName = `${Date.now()}_${safeOriginalName}`;

    await this.writeFileToUploadTargets(storedFileName, file.buffer, subFolder);
    return storedFileName;
  }

  async deleteStoredFile(fileName: string, subFolder = 'fieldService'): Promise<void> {
    const targetDirs = this.getUploadTargetDirs(subFolder);

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

  resolveLink(fileName: unknown, subFolder = 'fieldService'): string | null {
    if (typeof fileName !== 'string' || !fileName) {
      return null;
    }

    const publicBaseUrl = this.getPublicBaseUrl(subFolder);
    return `${publicBaseUrl}/${fileName}`;
  }

  async withResolvedLink<T extends Record<string, unknown>>(row: T): Promise<T> {
    const fileName = row?.fileName;
    const existingLink = typeof row?.link === 'string' ? row.link.trim() : '';
    const subFolder = this.resolveSubFolder(row);

    if (typeof fileName !== 'string' || !fileName) {
      return row;
    }

    const localLink = this.resolveLink(fileName, subFolder);
    if (localLink && (await this.fileExistsInUploadTargets(fileName, subFolder))) {
      return {
        ...row,
        link: localLink,
      };
    }

    if (existingLink) {
      return {
        ...row,
        link: existingLink,
      };
    }

    return {
      ...row,
      link: `${this.remoteBaseUrl}/${subFolder}/${fileName}`,
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

    return '/uploads';
  }

  private getUploadTargetDirs(subFolder: string): string[] {
    if (this.explicitUploadDirs.length > 0) {
      return this.explicitUploadDirs;
    }

    return this.uploadRootDirs.map((rootDir) => join(rootDir, subFolder));
  }

  private getPublicBaseUrl(subFolder: string): string {
    if (this.explicitPublicBaseUrl) {
      return this.explicitPublicBaseUrl;
    }

    return `${this.publicRootBaseUrl}/${subFolder}`;
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

    return 'fieldService';
  }
}

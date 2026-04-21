import { BadRequestException, Body, Controller, Delete, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileStorageService } from './file-storage.service';

@Controller('file-storage')
export class FileStorageController {
  constructor(private readonly service: FileStorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Body('folder') folder?: string,
    @Body('subFolder') subFolder?: string,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    const targetFolder = folder || subFolder || 'general';
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
  async delete(
    @Body('image_url') imageUrl?: string,
    @Body('url') url?: string,
    @Body('fileName') fileName?: string,
    @Body('folder') folder?: string,
    @Body('subFolder') subFolder?: string,
  ) {
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

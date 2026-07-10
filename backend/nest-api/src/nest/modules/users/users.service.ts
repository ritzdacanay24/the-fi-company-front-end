import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRecord, UsersRepository } from './users.repository';
import { RowDataPacket } from 'mysql2/promise';
import { FileStorageService } from '@/nest/modules/file-storage/file-storage.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async getList(active?: number): Promise<UserRecord[]> {
    return this.usersRepository.getList(active);
  }

  async getById(id: number): Promise<UserRecord> {
    const user = await this.usersRepository.getById(id);

    if (!user) {
      throw new NotFoundException({
        code: 'RC_USER_NOT_FOUND',
        message: `User with id ${id} not found`,
      });
    }

    return user;
  }

  async find(filters: Record<string, unknown>): Promise<UserRecord[]> {
    return this.usersRepository.find(filters);
  }

  async getUserWithTechRate(): Promise<RowDataPacket[]> {
    return this.usersRepository.getUserWithTechRate();
  }

  async getUserWithTechRateById(id: number): Promise<RowDataPacket> {
    const user = await this.usersRepository.getUserWithTechRateById(id);
    if (!user) {
      throw new NotFoundException({
        code: 'RC_USER_NOT_FOUND',
        message: `User with id ${id} not found`,
      });
    }
    return user;
  }

  async search(text: string): Promise<UserRecord[]> {
    return this.usersRepository.search(text);
  }

  async create(payload: Record<string, unknown>): Promise<UserRecord> {
    const safe = this.usersRepository.sanitizePayload(payload);
    const insertId = await this.usersRepository.create(safe);
    return this.getById(insertId);
  }

  async update(id: number, payload: Record<string, unknown>): Promise<UserRecord> {
    await this.getById(id); // throws if not found
    const safe = this.usersRepository.sanitizePayload(payload);
    await this.usersRepository.updateById(id, safe);
    return this.getById(id);
  }

  async updateOrgChartPosition(
    id: number,
    payload: { parentId?: number | null; beforeId?: number | null; afterId?: number | null },
  ): Promise<UserRecord> {
    await this.getById(id);

    const beforeId = payload.beforeId == null ? null : Number(payload.beforeId);
    const afterId = payload.afterId == null ? null : Number(payload.afterId);
    const parentId = payload.parentId == null ? null : Number(payload.parentId);

    if (beforeId != null && afterId != null && beforeId === afterId) {
      throw new BadRequestException('beforeId and afterId cannot reference the same sibling');
    }

    await this.usersRepository.updateOrgChartPosition(id, {
      parentId,
      beforeId,
      afterId,
    });

    return this.getById(id);
  }

  async resetPassword(email: string, newPassword: string): Promise<{ message: string; type: string }> {
    const updated = await this.usersRepository.resetPasswordByEmail(email, newPassword);

    if (!updated) {
      return { message: 'Email not found', type: 'danger' };
    }

    return { message: 'Password is now reset.', type: 'success' };
  }

  async uploadPhoto(id: number, file?: { originalname?: string; buffer?: Buffer }) {
    const user = await this.getById(id);

    const subFolder = 'users';
    let storedFileName: string;
    let url: string | null;

    if (this.fileStorageService.isS3Mode()) {
      const stored = await this.fileStorageService.storeUploadedFileInBucket(file, {
        keyPrefix: `${subFolder}/${id}`,
      });
      storedFileName = stored.fileName;
      url = stored.url;
    } else {
      storedFileName = await this.fileStorageService.storeUploadedFile(file, subFolder);
      url = this.fileStorageService.resolveLink(storedFileName, subFolder);
    }

    await this.usersRepository.updateById(id, {
      image: url,
      fileName: storedFileName,
      showImage: 1,
    });

    await this.deleteUserImageAssets(user);

    return {
      success: true,
      message: 'Photo uploaded successfully',
      url,
      fileName: storedFileName,
    };
  }

  async deletePhoto(id: number) {
    const user = await this.getById(id);

    await this.deleteUserImageAssets(user);

    await this.usersRepository.updateById(id, {
      image: '',
      fileName: '',
      showImage: 0,
    });

    return {
      success: true,
      message: 'Photo removed successfully',
    };
  }

  private async deleteUserImageAssets(user: Pick<UserRecord, 'image' | 'fileName'>): Promise<void> {
    const currentImage = String(user?.image || '').trim();
    const currentFileName = String(user?.fileName || '').trim();

    if (!currentImage && !currentFileName) {
      return;
    }

    const subFolder = 'users';

    if (this.fileStorageService.isS3Mode()) {
      const bucketKey = this.resolveBucketKey(currentImage, currentFileName, subFolder);
      if (bucketKey) {
        await this.fileStorageService.deleteStoredFileInBucket(bucketKey);
      }
      return;
    }

    const fileName = currentFileName || this.resolveFileNameFromUrl(currentImage);
    if (fileName) {
      await this.fileStorageService.deleteStoredFile(fileName, subFolder);
    }
  }

  private resolveBucketKey(imageUrl: string, fileName: string, subFolder: string): string {
    const rawUrl = String(imageUrl || '').trim();
    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        const segments = decodeURIComponent(parsed.pathname || '')
          .split('/')
          .filter(Boolean);

        if (segments.length) {
          const bucketName = String(process.env.FILE_STORAGE_DEFAULT_BUCKET || '').trim();
          if (bucketName && segments[0] === bucketName) {
            return segments.slice(1).join('/');
          }

          return segments.join('/');
        }
      } catch {
        // Fall back to fileName-derived key when URL parsing fails.
      }
    }

    const normalizedFileName = this.resolveFileNameFromUrl(fileName) || fileName;
    if (normalizedFileName) {
      return `${subFolder}/${normalizedFileName}`;
    }

    return '';
  }

  private resolveFileNameFromUrl(value: string): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }

    try {
      const parsed = new URL(raw);
      const segments = decodeURIComponent(parsed.pathname || '').split('/').filter(Boolean);
      return segments[segments.length - 1] || '';
    } catch {
      const cleaned = raw.split('?')[0].split('#')[0];
      const segments = cleaned.split('/').filter(Boolean);
      return segments[segments.length - 1] || '';
    }
  }
}

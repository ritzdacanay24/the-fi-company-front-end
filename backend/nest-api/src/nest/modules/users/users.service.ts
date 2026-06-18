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
    await this.getById(id);

    const subFolder = 'users';

    let storedFileName: string;
    let url: string | null;

    if (this.shouldUseBucketStorage()) {
      const stored = await this.fileStorageService.storeUploadedFileInBucket(file, {
        keyPrefix: `${subFolder}/${id}`,
        fixedFileName: 'photo.jpg',
        preferUnsignedUrl: true,
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

    return {
      success: true,
      message: 'Photo uploaded successfully',
      url,
      fileName: storedFileName,
    };
  }

  async deletePhoto(id: number) {
    const user = await this.getById(id);
    const subFolder = 'users';

    if (this.shouldUseBucketStorage()) {
      const bucket = String(process.env.MEDIA_STORAGE_BUCKET || '').trim() || undefined;
      const key = this.resolveUserPhotoBucketKey(id, user);
      await this.fileStorageService.deleteStoredFileInBucket(key, bucket);
    } else if (user.fileName) {
      await this.fileStorageService.deleteStoredFile(String(user.fileName), subFolder);
    }

    await this.usersRepository.updateById(id, {
      image: null,
      fileName: null,
      showImage: 0,
    });

    return {
      success: true,
      message: 'Photo removed successfully',
    };
  }

  private shouldUseBucketStorage(): boolean {
    const mode = String(process.env.MEDIA_STORAGE_MODE || '').trim().toLowerCase();
    const bucket = String(process.env.MEDIA_STORAGE_BUCKET || '').trim();

    if (mode === 'local') {
      return false;
    }

    return mode === 'bucket' || mode === 's3' || !!bucket;
  }

  private resolveUserPhotoBucketKey(id: number, user: UserRecord): string {
    const fallbackFileName = String(user.fileName || 'photo.jpg').trim() || 'photo.jpg';
    const fallbackKey = `users/${id}/${fallbackFileName}`;
    const image = String(user.image || '').trim();
    if (!image) {
      return fallbackKey;
    }

    let pathname = image;

    // Strip query string when legacy signed URLs were previously stored.
    const queryIndex = pathname.indexOf('?');
    if (queryIndex >= 0) {
      pathname = pathname.slice(0, queryIndex);
    }

    // Parse absolute URLs safely.
    if (/^https?:\/\//i.test(pathname)) {
      try {
        pathname = new URL(pathname).pathname;
      } catch {
        return fallbackKey;
      }
    }

    pathname = pathname.replace(/^\/+/, '');
    const usersIndex = pathname.indexOf('users/');
    if (usersIndex < 0) {
      return fallbackKey;
    }

    return pathname.slice(usersIndex);
  }
}

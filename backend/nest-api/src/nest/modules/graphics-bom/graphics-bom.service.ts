import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { GraphicsBomRepository } from './graphics-bom.repository';
import { FileStorageService } from '../file-storage/file-storage.service';

@Injectable()
export class GraphicsBomService {
  constructor(
    private readonly repository: GraphicsBomRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async getList(): Promise<RowDataPacket[]> {
    return this.repository.getList();
  }

  async find(filters: Record<string, unknown>) {
    return this.repository.find(filters);
  }

  async getAll() {
    return this.repository.getAll();
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_GRAPHICS_BOM_NOT_FOUND',
        message: `Graphics BOM with id ${id} not found`,
      });
    }
    return row;
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    return { insertId };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const rowCount = await this.repository.updateById(id, payload);
    return { rowCount };
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }

  async upload(file?: { originalname?: string; buffer: Buffer }) {
    if (!file?.originalname || !file?.buffer) {
      return { answer: 'No files' };
    }

    const bucket = (process.env.GRAPHICS_BOM_BUCKET || process.env.FILE_STORAGE_DEFAULT_BUCKET || 'graphics-bom').trim();
    const stored = await this.fileStorageService.storeUploadedFileInBucket(file, {
      bucket,
      keyPrefix: 'Yellowfish',
    });

    return {
      answer: 'File transfer completed',
      bucket: stored.bucket,
      key: stored.key,
      url: stored.url,
    };
  }
}

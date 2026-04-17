import { Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RowDataPacket } from 'mysql2';
import { GraphicsBomRepository } from './graphics-bom.repository';

@Injectable()
export class GraphicsBomService {
  private readonly graphicsUploadDir = '/var/www/html/attachments_mount/Yellowfish';

  constructor(private readonly repository: GraphicsBomRepository) {}

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

    await mkdir(this.graphicsUploadDir, { recursive: true });
    const targetPath = join(this.graphicsUploadDir, file.originalname);
    await writeFile(targetPath, file.buffer);

    return { answer: 'File transfer completed' };
  }
}

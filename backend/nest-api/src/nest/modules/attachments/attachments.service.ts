import { Injectable, NotFoundException } from '@nestjs/common';
import { extname } from 'node:path';
import { AttachmentsMetadataService } from './attachments-metadata.service';
import { AttachmentsStorageService } from '@/nest/modules/attachments/attachments-storage.service';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly metadataService: AttachmentsMetadataService,
    private readonly storageService: AttachmentsStorageService,
  ) {}

  async create(
    payload: Record<string, unknown>,
    file?: { originalname?: string; buffer?: Buffer },
  ) {
    const subFolder = this.resolveSubFolder(payload);
    const storedFileName = await this.storageService.storeUploadedFile(file, subFolder);
    const normalizedPayload = this.normalizeCreatePayload(payload, storedFileName, file?.originalname);

    try {
      const insertId = await this.metadataService.createAttachment(normalizedPayload);

      return { message: 'Created successfully', insertId };
    } catch (error) {
      await this.storageService.deleteStoredFile(storedFileName, subFolder);
      throw error;
    }
  }

  private resolveSubFolder(payload: Record<string, unknown>): string {
    const explicitSubFolder = typeof payload?.subFolder === 'string' ? payload.subFolder.trim() : '';
    if (explicitSubFolder) {
      return explicitSubFolder;
    }

    const field = typeof payload?.field === 'string' ? payload.field.toLowerCase() : '';
    if (field.includes('field service')) {
      return 'fieldService';
    }

    return 'fieldService';
  }

  async getByWorkOrderId(workOrderId: number) {
    const rows = await this.metadataService.getByWorkOrderId(workOrderId);
    return Promise.all(rows.map((row) => this.storageService.withResolvedLink(row)));
  }

  async find(filters: Record<string, string>) {
    const rows = await this.metadataService.find(filters);
    return Promise.all(rows.map((row) => this.storageService.withResolvedLink(row)));
  }

  async getAllRelatedAttachments(id: number) {
    const rows = await this.metadataService.getAllRelatedAttachments(id);
    return Promise.all(rows.map((row) => this.storageService.withResolvedLink(row)));
  }

  async getViewById(id: number) {
    const row = await this.metadataService.getById(id);
    if (!row) {
      throw new NotFoundException('Attachment not found');
    }

    const resolved = await this.storageService.withResolvedLink(row as Record<string, unknown>);
    const link = typeof resolved?.link === 'string' ? resolved.link.trim() : '';
    if (!link) {
      throw new NotFoundException('Attachment URL not available');
    }

    return {
      id,
      url: link,
      fileName: resolved?.fileName,
      storage_source: resolved?.storage_source,
    };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    return this.metadataService.updateById(id, payload);
  }

  async deleteById(id: number) {
    return this.metadataService.deleteById(id);
  }

  private normalizeCreatePayload(
    payload: Record<string, unknown>,
    storedFileName: string,
    originalName?: string,
  ): Record<string, unknown> {
    const createdDate = this.normalizeCreatedDate(payload.createdDate);
    const uniqueId = payload.uniqueId ?? payload.uniqueData;
    const ext = this.normalizeExtension(payload.ext, originalName);
    const subFolder = this.resolveSubFolder(payload);
    const link = this.normalizeLink(payload.link, storedFileName, subFolder);

    return {
      ...payload,
      fileName: storedFileName,
      createdDate,
      uniqueId,
      link,
      ext,
      storage_source: 'local',
    };
  }

  private normalizeCreatedDate(value: unknown): string {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  private normalizeExtension(value: unknown, originalName?: string): string | undefined {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (!originalName) {
      return undefined;
    }

    const extension = extname(originalName).replace('.', '').trim();
    return extension || undefined;
  }

  private normalizeLink(value: unknown, fileName: string, subFolder: string): string | undefined {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return this.storageService.resolveLink(fileName, subFolder) || undefined;
  }
}

import { Injectable } from '@nestjs/common';
import { AttachmentsMetadataService } from './attachments-metadata.service';
import { AttachmentsStorageService } from './attachments-storage.service';

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

    try {
      const insertId = await this.metadataService.createAttachment({
        ...payload,
        fileName: storedFileName,
      });

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
    return this.metadataService.find(filters);
  }

  async getAllRelatedAttachments(id: number) {
    const rows = await this.metadataService.getAllRelatedAttachments(id);
    return Promise.all(rows.map((row) => this.storageService.withResolvedLink(row)));
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    return this.metadataService.updateById(id, payload);
  }

  async deleteById(id: number) {
    return this.metadataService.deleteById(id);
  }
}

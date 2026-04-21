import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TripExpenseRepository } from './trip-expense.repository';
import { FileStorageService } from '@/nest/modules/file-storage/file-storage.service';

@Injectable()
export class TripExpenseService {
  constructor(
    private readonly repository: TripExpenseRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async getByWorkOrderId(workOrderId: number) {
    const rows = await this.repository.getByWorkOrderId(workOrderId);
    return Promise.all(rows.map((row) => this.fileStorageService.withResolvedLink(row as Record<string, unknown>)));
  }

  async getByFsId(fsSchedulerId: number) {
    const rows = await this.repository.getByFsId(fsSchedulerId);
    return Promise.all(rows.map((row) => this.fileStorageService.withResolvedLink(row as Record<string, unknown>)));
  }

  async getById(id: number) {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException(`Trip expense ${id} not found`);
    }

    return this.fileStorageService.withResolvedLink(row as Record<string, unknown>);
  }

  async create(
    payload: Record<string, unknown> | null | undefined,
    file?: { originalname?: string; buffer?: Buffer },
  ) {
    const normalizedPayload = this.normalizePayload(payload);
    if (file?.buffer && file?.originalname) {
      normalizedPayload.fileName = await this.fileStorageService.storeUploadedFile(file, 'fieldService');
    }

    const sanitized = this.repository.sanitizePayload(normalizedPayload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const insertId = await this.repository.create(sanitized);
    return { insertId, message: 'Created successfully' };
  }

  async update(
    id: number,
    payload: Record<string, unknown> | null | undefined,
    file?: { originalname?: string; buffer?: Buffer },
  ) {
    const normalizedPayload = this.normalizePayload(payload);
    if (file?.buffer && file?.originalname) {
      normalizedPayload.fileName = await this.fileStorageService.storeUploadedFile(file, 'fieldService');
    }

    const sanitized = this.repository.sanitizePayload(normalizedPayload);
    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('Payload is empty');
    }

    const affectedRows = await this.repository.updateById(id, sanitized);
    if (!affectedRows) {
      throw new NotFoundException(`Trip expense ${id} not found`);
    }

    return { message: 'Updated successfully' };
  }

  async delete(id: number) {
    const affectedRows = await this.repository.deleteById(id);
    if (!affectedRows) {
      throw new NotFoundException(`Trip expense ${id} not found`);
    }

    return { success: true };
  }

  private normalizePayload(payload: Record<string, unknown> | null | undefined): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }

    const normalized: Record<string, unknown> = { ...payload };
    const nullableIntegerFields = new Set([
      'copiedFromTicketId',
      'fromId',
      'transaction_id',
      'workOrderId',
      'fs_scheduler_id',
      'created_by',
      'split',
      'to_spit',
    ]);

    for (const [key, rawValue] of Object.entries(normalized)) {
      if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim();
        const lower = trimmed.toLowerCase();

        if (lower === 'null' || lower === 'undefined' || trimmed === '') {
          normalized[key] = null;
          continue;
        }

        if (nullableIntegerFields.has(key)) {
          const parsed = Number.parseInt(trimmed, 10);
          normalized[key] = Number.isFinite(parsed) ? parsed : null;
          continue;
        }

        normalized[key] = trimmed;
      }
    }

    return normalized;
  }
}

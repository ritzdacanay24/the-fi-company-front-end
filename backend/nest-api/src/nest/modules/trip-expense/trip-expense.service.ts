import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TripExpenseRepository } from './trip-expense.repository';
import { FileStorageService } from '@/nest/modules/file-storage/file-storage.service';
import { FeatureType } from '@/shared/enums/feature.enum';

@Injectable()
export class TripExpenseService {
  private readonly defaultMindeeModelId = String(process.env.MINDEE_MODEL_ID || 'c3254c99-5d36-4f4d-85b5-16066a62f865').trim();
  private readonly mindeeBaseUrl = String(process.env.MINDEE_BASE_URL || 'https://api-v2.mindee.net/v2').trim();

  constructor(
    private readonly repository: TripExpenseRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async parseReceipt(
    file?: { originalname?: string; buffer?: Buffer; mimetype?: string },
    payload: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (!file?.buffer || !file?.originalname) {
      throw new BadRequestException('file is required');
    }

    const apiKey = this.resolveMindeeApiKey(payload);
    const modelId = String(payload?.modelId || this.defaultMindeeModelId).trim();
    if (!modelId) {
      throw new BadRequestException('modelId is required');
    }

    const enqueueResponse = await this.enqueueMindeeInference(file, modelId, apiKey, payload);
    const pollingUrl = String(enqueueResponse?.job?.polling_url || '').trim();
    if (!pollingUrl) {
      throw new BadRequestException('Mindee polling URL missing from enqueue response');
    }

    return this.pollMindeeInference(pollingUrl, apiKey);
  }

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
      if (this.fileStorageService.isS3Mode()) {
        const keyPrefix = this.resolveTicketReceiptsKeyPrefix(normalizedPayload);
        const uploaded = await this.fileStorageService.storeUploadedFileInBucket(
          file,
          { keyPrefix },
        );
        normalizedPayload.fileName = uploaded.fileName;
        normalizedPayload.originalFileLink = uploaded.url;
      } else {
        normalizedPayload.fileName = await this.fileStorageService.storeUploadedFile(file, 'fieldService');
      }
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
      if (this.fileStorageService.isS3Mode()) {
        const existingRow = await this.repository.getById(id);
        if (!existingRow) {
          throw new NotFoundException(`Trip expense ${id} not found`);
        }
        const keyPrefix = this.resolveTicketReceiptsKeyPrefix(normalizedPayload, existingRow);
        const uploaded = await this.fileStorageService.storeUploadedFileInBucket(
          file,
          { keyPrefix },
        );
        normalizedPayload.fileName = uploaded.fileName;
        normalizedPayload.originalFileLink = uploaded.url;
      } else {
        normalizedPayload.fileName = await this.fileStorageService.storeUploadedFile(file, 'fieldService');
      }
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

  private resolveTicketReceiptsKeyPrefix(
    payload: Record<string, unknown>,
    existingRow?: Record<string, unknown> | null,
  ): string {
    const rawCandidates = [
      payload?.workOrderId,
      payload?.fs_scheduler_id,
      existingRow?.workOrderId,
      existingRow?.fs_scheduler_id,
    ];

    for (const raw of rawCandidates) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        return `${FeatureType.TICKET_RECEIPTS}/${Math.floor(parsed)}`;
      }
    }

    return FeatureType.TICKET_RECEIPTS;
  }

  private resolveMindeeApiKey(payload: Record<string, unknown>): string {
    const envKey = String(process.env.MINDEE_API_KEY || '').trim();
    const payloadKey = String(
      payload?.apiKey || payload?.apikey || payload?.mindeeApiKey || '',
    ).trim();
    const apiKey = payloadKey || envKey;

    if (!apiKey) {
      throw new BadRequestException('Mindee API key is not configured');
    }

    return apiKey;
  }

  private async enqueueMindeeInference(
    file: { originalname?: string; buffer?: Buffer; mimetype?: string },
    modelId: string,
    apiKey: string,
    payload: Record<string, unknown>,
  ): Promise<any> {
    const form = new FormData();
    form.append('model_id', modelId);
    const fileBytes = file.buffer as unknown as BlobPart;
    form.append(
      'file',
      new Blob([fileBytes], { type: file.mimetype || 'application/octet-stream' }),
      file.originalname || 'receipt.jpg',
    );

    const booleanKeys = ['raw_text', 'polygon', 'rag'];
    for (const key of booleanKeys) {
      if (payload?.[key] === true || payload?.[key] === 'true') {
        form.append(key, 'true');
      }
    }

    if (typeof payload?.alias === 'string' && payload.alias.trim()) {
      form.append('alias', payload.alias.trim());
    }

    const response = await fetch(`${this.mindeeBaseUrl}/inferences/enqueue`, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
      },
      body: form,
    });

    const data = await this.safeJson(response);
    if (!response.ok) {
      throw new BadRequestException(data?.detail || `Mindee enqueue failed (${response.status})`);
    }

    return data;
  }

  private async pollMindeeInference(pollingUrl: string, apiKey: string): Promise<unknown> {
    const maxAttempts = 60;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await fetch(pollingUrl, {
        method: 'GET',
        headers: {
          Authorization: apiKey,
        },
      });

      const data = await this.safeJson(response);
      if (!response.ok) {
        throw new BadRequestException(data?.detail || `Mindee polling failed (${response.status})`);
      }

      if (data?.inference) {
        return data;
      }

      const status = String(data?.job?.status || '').toLowerCase();
      if (status === 'failed' || status === 'error') {
        throw new BadRequestException(data?.job?.error?.detail || 'Mindee inference failed');
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    throw new BadRequestException('Mindee inference polling timeout');
  }

  private async safeJson(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }
}

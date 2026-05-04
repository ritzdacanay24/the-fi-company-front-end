import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IgtSerialNumbersRepository } from './igt-serial-numbers.repository';
import { CreateIgtSerialDto } from './dto/create-igt-serial.dto';
import { UpdateIgtSerialDto } from './dto/update-igt-serial.dto';
import { BulkUploadOptionsDto } from './dto/bulk-create-igt-serial.dto';
import { SerialAssignmentLinkService } from '@/shared/services/serial-assignment-link.service';

const IGT_CUSTOMER_TYPE_ID = 1;

@Injectable()
export class IgtSerialNumbersService {
  constructor(
    private readonly repo: IgtSerialNumbersRepository,
    private readonly serialAssignmentLinkService: SerialAssignmentLinkService,
  ) {}

  async findAll(params: {
    search?: string;
    status?: string;
    category?: string;
    includeInactive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const rows = await this.repo.findAll(params);
    return { success: true, data: rows, count: rows.length };
  }

  async findById(id: number) {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException(`IGT serial #${id} not found`);
    return { success: true, data: row };
  }

  async create(dto: CreateIgtSerialDto) {
    const result = await this.repo.insertOne(dto);
    return { success: true, id: result.insertId };
  }

  async bulkCreate(
    serials: CreateIgtSerialDto[],
    duplicateStrategy: 'skip' | 'replace' | 'error' = 'skip',
  ) {
    const result = await this.repo.bulkCreate(serials, duplicateStrategy);
    return { success: true, ...result };
  }

  async markSerialsUsedFromWorkflow(
    assignments: Array<Record<string, unknown>>,
    usedBy: string,
  ): Promise<{
    updated: number;
    missing: string[];
    data: Array<{ id: number; serial_number: string; status: string }>;
  }> {
    const normalizedUsedBy = String(usedBy || '').trim() || 'System';
    const nowDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const missing: string[] = [];
    const data: Array<{ id: number; serial_number: string; status: string }> = [];

    for (const assignment of assignments) {
      const assetIdRaw = assignment['igt_asset_id'];
      const assetId = assetIdRaw == null || assetIdRaw === '' ? null : Number(assetIdRaw);
      const serialNumber = String(
        assignment['igt_serial_number'] || assignment['assetNumber'] || assignment['serial_number'] || '',
      ).trim();

      let row = null;
      if (assetId != null && Number.isFinite(assetId) && assetId > 0) {
        row = await this.repo.findById(assetId);
      }

      if (!row && serialNumber) {
        row = await this.repo.findBySerialNumber(serialNumber);
      }

      if (!row) {
        missing.push(serialNumber || `igt_asset_id:${String(assetIdRaw ?? '')}`);
        continue;
      }

      const id = Number(row['id']);
      const resolvedSerialNumber = String(row['serial_number'] || serialNumber);

      await this.repo.update(id, {
        status: 'used',
        used_at: nowDate,
        used_by: normalizedUsedBy,
        updated_by: normalizedUsedBy,
      });

      data.push({
        id,
        serial_number: resolvedSerialNumber,
        status: 'used',
      });
    }

    return {
      updated: data.length,
      missing,
      data,
    };
  }

  async bulkUploadWithOptions(dto: BulkUploadOptionsDto) {
    const serials: CreateIgtSerialDto[] = dto.serialNumbers.map((s) => ({
      serial_number: s.serial_number,
      category: s.category ?? dto.category ?? 'gaming',
    }));
    const result = await this.repo.bulkCreate(serials, dto.duplicateStrategy ?? 'skip');
    return { success: true, ...result };
  }

  async update(id: number, dto: UpdateIgtSerialDto) {
    const hasActiveAssignment = await this.serialAssignmentLinkService.hasActiveAssignmentByCustomerAsset(
      IGT_CUSTOMER_TYPE_ID,
      id,
    );

    if (dto.is_active === 0 && hasActiveAssignment) {
      throw new BadRequestException(
        'Cannot write off IGT serial because it is linked to an active serial assignment. Resolve the assignment first.',
      );
    }

    if (dto.status === 'available' && hasActiveAssignment) {
      throw new BadRequestException(
        'Cannot restore IGT serial to available because it is linked to an active serial assignment. Void or resolve the assignment first.',
      );
    }

    await this.repo.update(id, dto);
    return { success: true };
  }

  async softDelete(id: number) {
    await this.repo.softDelete(id);
    return { success: true };
  }

  async hardDelete(id: number) {
    await this.repo.hardDelete(id);
    return { success: true };
  }

  async bulkSoftDelete(ids: number[]) {
    await this.repo.bulkSoftDelete(ids);
    return { success: true };
  }

  async bulkHardDelete(ids: number[]) {
    await this.repo.bulkHardDelete(ids);
    return { success: true };
  }

  async getStats() {
    const stats = await this.repo.getStats();
    return { success: true, data: stats };
  }

  async getAvailable(category = 'gaming', limit = 5000) {
    const rows = await this.repo.getAvailable(category, limit);
    return { success: true, data: rows, count: rows.length };
  }

  async reserve(serialNumber: string) {
    await this.repo.setStatus(serialNumber, 'reserved');
    return { success: true };
  }

  async release(serialNumber: string) {
    await this.repo.setStatus(serialNumber, 'available');
    return { success: true };
  }

  async checkExisting(serialNumbers: string[]) {
    const existing = await this.repo.checkExisting(serialNumbers);
    return { success: true, data: existing };
  }
}

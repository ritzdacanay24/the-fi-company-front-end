import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BulkCreateSgAssetDto } from './dto/bulk-create-sg-asset.dto';
import { CreateSgAssetDto } from './dto/create-sg-asset.dto';
import { UpdateSgAssetDto } from './dto/update-sg-asset.dto';
import { SgAssetRecord, SgAssetRepository } from './sg-asset.repository';

@Injectable()
export class SgAssetService {
  constructor(private readonly sgAssetRepository: SgAssetRepository) {}

  async getList(params: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll?: boolean;
  }): Promise<SgAssetRecord[]> {
    return this.sgAssetRepository.getList(params);
  }

  async getAll(): Promise<SgAssetRecord[]> {
    return this.sgAssetRepository.getAll();
  }

  async getById(id: number): Promise<SgAssetRecord> {
    const record = await this.sgAssetRepository.getById(id);
    if (!record) {
      throw new NotFoundException({
        code: 'RC_SG_ASSET_NOT_FOUND',
        message: `SG asset with id ${id} not found`,
      });
    }
    return record;
  }

  async checkIfSerialIsFound(assetNumber?: string): Promise<{ generated_SG_asset?: string } | null> {
    const value = String(assetNumber || '').trim();
    if (!value) {
      throw new BadRequestException({
        code: 'RC_SG_ASSET_NUMBER_REQUIRED',
        message: 'assetNumber is required',
      });
    }

    return this.sgAssetRepository.checkIfSerialIsFound(value);
  }

  async create(payload: CreateSgAssetDto, userFullName?: string): Promise<{ insertId: number }> {
    return this.sgAssetRepository.createSgAsset(payload, userFullName);
  }

  async updateById(id: number, payload: UpdateSgAssetDto): Promise<{ success: true; id: number }> {
    const existing = await this.sgAssetRepository.getById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_SG_ASSET_NOT_FOUND',
        message: `SG asset with id ${id} not found`,
      });
    }

    const affected = await this.sgAssetRepository.updateById(id, payload);
    if (affected === 0) {
      throw new BadRequestException({
        code: 'RC_SG_ASSET_EMPTY_UPDATE',
        message: 'No valid fields provided for update',
      });
    }

    return { success: true, id };
  }

  async deleteById(id: number): Promise<{ success: true; id: number }> {
    const existing = await this.sgAssetRepository.getById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_SG_ASSET_NOT_FOUND',
        message: `SG asset with id ${id} not found`,
      });
    }

    await this.sgAssetRepository.deleteByIdHard(id);
    return { success: true, id };
  }

  async bulkCreate(payload: BulkCreateSgAssetDto) {
    if (!Array.isArray(payload.assignments) || payload.assignments.length === 0) {
      throw new BadRequestException({
        code: 'RC_SG_ASSET_ASSIGNMENTS_REQUIRED',
        message: 'Invalid data. assignments array is required.',
      });
    }

    return this.sgAssetRepository.bulkCreate(payload);
  }
}

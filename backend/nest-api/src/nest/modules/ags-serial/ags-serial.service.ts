import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BulkCreateAgsSerialDto } from './dto/bulk-create-ags-serial.dto';
import { CreateAgsSerialDto } from './dto/create-ags-serial.dto';
import { UpdateAgsSerialDto } from './dto/update-ags-serial.dto';
import { AgsSerialRecord, AgsSerialRepository } from './ags-serial.repository';

@Injectable()
export class AgsSerialService {
  constructor(private readonly agsSerialRepository: AgsSerialRepository) {}

  async getList(params: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll?: boolean;
  }): Promise<AgsSerialRecord[]> {
    return this.agsSerialRepository.getList(params);
  }

  async getAll(): Promise<AgsSerialRecord[]> {
    return this.agsSerialRepository.getAll();
  }

  async getById(id: number): Promise<AgsSerialRecord> {
    const record = await this.agsSerialRepository.getById(id);
    if (!record) {
      throw new NotFoundException({
        code: 'RC_AGS_SERIAL_NOT_FOUND',
        message: `AGS serial with id ${id} not found`,
      });
    }
    return record;
  }

  async checkIfSerialIsFound(assetNumber?: string): Promise<{ generated_SG_asset?: string } | null> {
    const value = String(assetNumber || '').trim();
    if (!value) {
      throw new BadRequestException({
        code: 'RC_AGS_ASSET_NUMBER_REQUIRED',
        message: 'assetNumber is required',
      });
    }
    return this.agsSerialRepository.checkIfSerialIsFound(value);
  }

  async create(payload: CreateAgsSerialDto, userFullName?: string): Promise<{ insertId: number }> {
    return this.agsSerialRepository.createAgsSerial(payload, userFullName);
  }

  async updateById(id: number, payload: UpdateAgsSerialDto): Promise<{ success: true; id: number }> {
    const existing = await this.agsSerialRepository.getById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_AGS_SERIAL_NOT_FOUND',
        message: `AGS serial with id ${id} not found`,
      });
    }

    const affected = await this.agsSerialRepository.updateById(id, payload);
    if (affected === 0) {
      throw new BadRequestException({
        code: 'RC_AGS_SERIAL_EMPTY_UPDATE',
        message: 'No valid fields provided for update',
      });
    }

    return { success: true, id };
  }

  async deleteById(id: number): Promise<{ success: true; id: number }> {
    const existing = await this.agsSerialRepository.getById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_AGS_SERIAL_NOT_FOUND',
        message: `AGS serial with id ${id} not found`,
      });
    }

    await this.agsSerialRepository.softDeleteById(id);
    return { success: true, id };
  }

  async bulkCreate(payload: BulkCreateAgsSerialDto) {
    if (!Array.isArray(payload.assignments) || payload.assignments.length === 0) {
      throw new BadRequestException({
        code: 'RC_AGS_SERIAL_ASSIGNMENTS_REQUIRED',
        message: 'Invalid data. assignments array is required.',
      });
    }
    return this.agsSerialRepository.bulkCreate(payload);
  }
}

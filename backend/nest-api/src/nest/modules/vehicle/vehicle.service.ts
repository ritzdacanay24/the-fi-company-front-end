import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';
import { VehicleRepository } from './vehicle.repository';

export interface VehicleListParams {
  selectedViewType?: string;
}

@Injectable()
export class VehicleService {
  constructor(@Inject(VehicleRepository) private readonly vehicleRepository: VehicleRepository) {}

  async getList(params: VehicleListParams): Promise<Record<string, unknown>[]> {
    const selectedViewType = (params.selectedViewType || '').trim();
    const rows = await this.vehicleRepository.getList(selectedViewType);
    return rows as Record<string, unknown>[];
  }

  async getAll(): Promise<Record<string, unknown>[]> {
    const rows = await this.vehicleRepository.getAll();
    return rows as Record<string, unknown>[];
  }

  async getById(id: number): Promise<Record<string, unknown>> {
    const row = await this.vehicleRepository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_VEHICLE_NOT_FOUND',
        message: `Vehicle record not found for id ${id}`,
      });
    }
    return row as Record<string, unknown>;
  }

  async find(filters: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const rows = await this.vehicleRepository.findMany(filters);
    return rows as Record<string, unknown>[];
  }

  async findOne(filters: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const row = await this.vehicleRepository.findSingle(filters);
    return (row as Record<string, unknown>) || null;
  }

  async checkAnyFailures(license: string): Promise<Record<string, unknown>[]> {
    const value = (license || '').trim();
    if (!value) {
      return [];
    }

    const rows = await this.vehicleRepository.checkAnyFailures(value);
    return rows as Record<string, unknown>[];
  }

  async create(payload: CreateVehicleDto): Promise<{ insertId: number }> {
    const payloadMap: Record<string, unknown> = { ...payload };
    const insertId = await this.vehicleRepository.createVehicle(payloadMap);
    return { insertId };
  }

  async updateById(id: number, payload: UpdateVehicleDto): Promise<{ rowCount: number }> {
    const payloadMap: Record<string, unknown> = { ...payload };
    const rowCount = await this.vehicleRepository.updateVehicleById(id, payloadMap);
    if (rowCount === 0) {
      throw new NotFoundException({
        code: 'RC_VEHICLE_NOT_FOUND',
        message: `Vehicle record not found for id ${id}`,
      });
    }
    return { rowCount };
  }

  async deleteById(id: number): Promise<{ rowCount: number }> {
    const rowCount = await this.vehicleRepository.deleteVehicleById(id);
    if (rowCount === 0) {
      throw new NotFoundException({
        code: 'RC_VEHICLE_NOT_FOUND',
        message: `Vehicle record not found for id ${id}`,
      });
    }
    return { rowCount };
  }
}

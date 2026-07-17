import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateVehicleDto, CreateVehicleMaintenanceDto, UpdateVehicleDto, UpdateVehicleMaintenanceDto } from './dto';
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

  async getMaintenanceByVehicleId(vehicleId: number): Promise<Record<string, unknown>[]> {
    const vehicle = await this.vehicleRepository.getById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException({
        code: 'RC_VEHICLE_NOT_FOUND',
        message: `Vehicle record not found for id ${vehicleId}`,
      });
    }

    const rows = await this.vehicleRepository.getMaintenanceByVehicleId(vehicleId);
    return rows as Record<string, unknown>[];
  }

  async createMaintenance(payload: CreateVehicleMaintenanceDto): Promise<{ insertId: number }> {
    const vehicle = await this.vehicleRepository.getById(payload.vehicle_id);
    if (!vehicle) {
      throw new NotFoundException({
        code: 'RC_VEHICLE_NOT_FOUND',
        message: `Vehicle record not found for id ${payload.vehicle_id}`,
      });
    }

    const insertId = await this.vehicleRepository.createMaintenance(payload);
    return { insertId };
  }

  async updateMaintenance(payload: UpdateVehicleMaintenanceDto): Promise<{ rowCount: number }> {
    const id = Number(payload?.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new NotFoundException({
        code: 'RC_VEHICLE_MAINTENANCE_NOT_FOUND',
        message: `Vehicle maintenance record not found for id ${id}`,
      });
    }

    const rowCount = await this.vehicleRepository.updateMaintenanceById(id, {
      service_date: payload.service_date,
      mileage: payload.mileage,
      service_type: payload.service_type,
      description: payload.description,
      vendor_name: payload.vendor_name,
      cost: payload.cost,
      work_order_no: payload.work_order_no,
      next_service_date: payload.next_service_date,
      next_service_mileage: payload.next_service_mileage,
      active: payload.active,
    });

    if (rowCount === 0) {
      throw new NotFoundException({
        code: 'RC_VEHICLE_MAINTENANCE_NOT_FOUND',
        message: `Vehicle maintenance record not found for id ${id}`,
      });
    }

    return { rowCount };
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

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateForkliftDto,
  CreateForkliftMaintenanceDto,
  UpdateForkliftDto,
  UpdateForkliftMaintenanceDto,
} from './dto';
import { ForkliftRepository } from './forklift.repository';

export interface ForkliftListParams {
  selectedViewType?: string;
}

@Injectable()
export class ForkliftService {
  constructor(@Inject(ForkliftRepository) private readonly forkliftRepository: ForkliftRepository) {}

  async getList(params: ForkliftListParams): Promise<Record<string, unknown>[]> {
    const selectedViewType = (params.selectedViewType || '').trim();
    const rows = await this.forkliftRepository.getList(selectedViewType);
    return rows as Record<string, unknown>[];
  }

  async getAll(): Promise<Record<string, unknown>[]> {
    const rows = await this.forkliftRepository.getAll();
    return rows as Record<string, unknown>[];
  }

  async getById(id: number): Promise<Record<string, unknown>> {
    const row = await this.forkliftRepository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_NOT_FOUND',
        message: `Forklift record not found for id ${id}`,
      });
    }
    return row as Record<string, unknown>;
  }

  async find(filters: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const rows = await this.forkliftRepository.findMany(filters);
    return rows as Record<string, unknown>[];
  }

  async findOne(filters: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const row = await this.forkliftRepository.findSingle(filters);
    return (row as Record<string, unknown>) || null;
  }

  async getInspectionOptions(): Promise<Array<{ name: string; details: Array<{ name: string }> }>> {
    const rows = await this.forkliftRepository.getInspectionOptions();
    const groups = new Map<string, string[]>();

    for (const row of rows) {
      const groupName = String(row.group_name || '').trim() || 'Other Forklifts';
      const unitName = String(row.unit_name || '').trim();
      if (!unitName) {
        continue;
      }

      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }

      groups.get(groupName)?.push(unitName);
    }

    return Array.from(groups.entries()).map(([name, units]) => ({
      name,
      details: units.map((unit) => ({ name: unit })),
    }));
  }

  async getMaintenanceByForkliftId(forkliftId: number): Promise<Record<string, unknown>[]> {
    const forklift = await this.forkliftRepository.getById(forkliftId);
    if (!forklift) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_NOT_FOUND',
        message: `Forklift record not found for id ${forkliftId}`,
      });
    }

    const rows = await this.forkliftRepository.getMaintenanceByForkliftId(forkliftId);
    return rows as Record<string, unknown>[];
  }

  async createMaintenance(payload: CreateForkliftMaintenanceDto): Promise<{ insertId: number }> {
    const forklift = await this.forkliftRepository.getById(payload.forklift_id);
    if (!forklift) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_NOT_FOUND',
        message: `Forklift record not found for id ${payload.forklift_id}`,
      });
    }

    const insertId = await this.forkliftRepository.createMaintenance(payload);
    return { insertId };
  }

  async updateMaintenance(payload: UpdateForkliftMaintenanceDto): Promise<{ rowCount: number }> {
    const id = Number(payload?.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_MAINTENANCE_NOT_FOUND',
        message: `Forklift maintenance record not found for id ${id}`,
      });
    }

    const rowCount = await this.forkliftRepository.updateMaintenanceById(id, {
      service_date: payload.service_date,
      hour_meter: payload.hour_meter,
      service_type: payload.service_type,
      description: payload.description,
      vendor_name: payload.vendor_name,
      cost: payload.cost,
      work_order_no: payload.work_order_no,
      next_service_date: payload.next_service_date,
      next_service_hour_meter: payload.next_service_hour_meter,
      active: payload.active,
    });

    if (rowCount === 0) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_MAINTENANCE_NOT_FOUND',
        message: `Forklift maintenance record not found for id ${id}`,
      });
    }

    return { rowCount };
  }

  async create(payload: CreateForkliftDto): Promise<{ insertId: number }> {
    const payloadMap: Record<string, unknown> = { ...payload };
    const insertId = await this.forkliftRepository.createForklift(payloadMap);
    return { insertId };
  }

  async updateById(id: number, payload: UpdateForkliftDto): Promise<{ rowCount: number }> {
    const payloadMap: Record<string, unknown> = { ...payload };
    const rowCount = await this.forkliftRepository.updateForkliftById(id, payloadMap);
    if (rowCount === 0) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_NOT_FOUND',
        message: `Forklift record not found for id ${id}`,
      });
    }
    return { rowCount };
  }

  async deleteById(id: number): Promise<{ rowCount: number }> {
    const rowCount = await this.forkliftRepository.deleteForkliftById(id);
    if (rowCount === 0) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_NOT_FOUND',
        message: `Forklift record not found for id ${id}`,
      });
    }
    return { rowCount };
  }
}

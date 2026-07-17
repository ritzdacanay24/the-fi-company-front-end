import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateComputerDto,
  CreateComputerMaintenanceDto,
  UpdateComputerDto,
  UpdateComputerMaintenanceDto,
} from './dto';
import { ComputerRepository } from './computer.repository';

export interface ComputerListParams {
  selectedViewType?: string;
}

@Injectable()
export class ComputerService {
  constructor(@Inject(ComputerRepository) private readonly computerRepository: ComputerRepository) {}

  private readonly typePrefixMap: Record<string, string> = {
    desktop: 'PC',
    laptop: 'LT',
    notebook: 'LT',
    tablet: 'TB',
    phone: 'PH',
    mobile: 'PH',
    smartphone: 'PH',
    workstation: 'WS',
    server: 'SV',
  };

  async getList(params: ComputerListParams): Promise<Record<string, unknown>[]> {
    const selectedViewType = (params.selectedViewType || '').trim();
    const rows = await this.computerRepository.getList(selectedViewType);
    return rows as Record<string, unknown>[];
  }

  async getAll(): Promise<Record<string, unknown>[]> {
    const rows = await this.computerRepository.getAll();
    return rows as Record<string, unknown>[];
  }

  async getById(id: number): Promise<Record<string, unknown>> {
    const row = await this.computerRepository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_COMPUTER_NOT_FOUND',
        message: `Computer record not found for id ${id}`,
      });
    }
    return row as Record<string, unknown>;
  }

  async find(filters: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const rows = await this.computerRepository.findMany(filters);
    return rows as Record<string, unknown>[];
  }

  async findOne(filters: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const row = await this.computerRepository.findSingle(filters);
    return (row as Record<string, unknown>) || null;
  }

  async getInspectionOptions(): Promise<Array<{ name: string; details: Array<{ name: string }> }>> {
    const rows = await this.computerRepository.getInspectionOptions();
    const groups = new Map<string, string[]>();

    for (const row of rows) {
      const groupName = String(row.group_name || '').trim() || 'Other Computers';
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

  async getMaintenanceByComputerId(computerId: number): Promise<Record<string, unknown>[]> {
    const computer = await this.computerRepository.getById(computerId);
    if (!computer) {
      throw new NotFoundException({
        code: 'RC_COMPUTER_NOT_FOUND',
        message: `Computer record not found for id ${computerId}`,
      });
    }

    const rows = await this.computerRepository.getMaintenanceByComputerId(computerId);
    return rows as Record<string, unknown>[];
  }

  async createMaintenance(payload: CreateComputerMaintenanceDto): Promise<{ insertId: number }> {
    const computer = await this.computerRepository.getById(payload.computer_id);
    if (!computer) {
      throw new NotFoundException({
        code: 'RC_COMPUTER_NOT_FOUND',
        message: `Computer record not found for id ${payload.computer_id}`,
      });
    }

    const insertId = await this.computerRepository.createMaintenance(payload);
    return { insertId };
  }

  async updateMaintenance(payload: UpdateComputerMaintenanceDto): Promise<{ rowCount: number }> {
    const id = Number(payload?.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new NotFoundException({
        code: 'RC_COMPUTER_MAINTENANCE_NOT_FOUND',
        message: `Computer maintenance record not found for id ${id}`,
      });
    }

    const rowCount = await this.computerRepository.updateMaintenanceById(id, {
      service_date: payload.service_date,
      usage_hours: payload.usage_hours,
      service_type: payload.service_type,
      description: payload.description,
      vendor_name: payload.vendor_name,
      cost: payload.cost,
      ticket_no: payload.ticket_no,
      next_service_date: payload.next_service_date,
      next_service_usage_hours: payload.next_service_usage_hours,
      active: payload.active,
    });

    if (rowCount === 0) {
      throw new NotFoundException({
        code: 'RC_COMPUTER_MAINTENANCE_NOT_FOUND',
        message: `Computer maintenance record not found for id ${id}`,
      });
    }

    return { rowCount };
  }

  async create(payload: CreateComputerDto): Promise<{ insertId: number }> {
    const payloadMap: Record<string, unknown> = { ...payload };

    const providedAssetTag = String(payloadMap.asset_tag || '').trim();
    if (!providedAssetTag) {
      const prefix = this.resolveTypePrefix(String(payloadMap.computer_type || ''));
      payloadMap.asset_tag = await this.computerRepository.generateNextAssetTag(prefix);
    }

    const insertId = await this.computerRepository.createComputer(payloadMap);
    return { insertId };
  }

  async updateById(id: number, payload: UpdateComputerDto): Promise<{ rowCount: number }> {
    const payloadMap: Record<string, unknown> = { ...payload };

    if (Object.prototype.hasOwnProperty.call(payloadMap, 'asset_tag')) {
      const cleanedAssetTag = String(payloadMap.asset_tag || '').trim();
      if (!cleanedAssetTag) {
        delete payloadMap.asset_tag;
      } else {
        payloadMap.asset_tag = cleanedAssetTag;
      }
    }

    const rowCount = await this.computerRepository.updateComputerById(id, payloadMap);
    if (rowCount === 0) {
      throw new NotFoundException({
        code: 'RC_COMPUTER_NOT_FOUND',
        message: `Computer record not found for id ${id}`,
      });
    }
    return { rowCount };
  }

  async deleteById(id: number): Promise<{ rowCount: number }> {
    const rowCount = await this.computerRepository.deleteComputerById(id);
    if (rowCount === 0) {
      throw new NotFoundException({
        code: 'RC_COMPUTER_NOT_FOUND',
        message: `Computer record not found for id ${id}`,
      });
    }
    return { rowCount };
  }

  private resolveTypePrefix(computerType: string): string {
    const normalizedType = (computerType || '').trim().toLowerCase();
    if (!normalizedType) {
      return 'CP';
    }

    const mappedPrefix = this.typePrefixMap[normalizedType];
    if (mappedPrefix) {
      return mappedPrefix;
    }

    const tokens = normalizedType
      .split(/[^a-z0-9]+/gi)
      .map((token) => token.trim())
      .filter(Boolean);

    if (tokens.length >= 2) {
      const initialA = tokens[0][0] || 'C';
      const initialB = tokens[1][0] || 'P';
      return `${initialA}${initialB}`.toUpperCase();
    }

    const compact = tokens[0] || normalizedType.replace(/[^a-z0-9]/gi, '');
    const padded = (compact + 'X').slice(0, 2);
    return padded.toUpperCase();
  }
}

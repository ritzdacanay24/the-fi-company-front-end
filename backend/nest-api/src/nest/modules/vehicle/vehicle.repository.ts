import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

export interface VehicleRow extends RowDataPacket {
  id: number;
  active: number;
}

@Injectable()
export class VehicleRepository extends BaseRepository<VehicleRow> {
  private readonly allowedFilterColumns = new Set([
    'id',
    'department',
    'vehicleMake',
    'year',
    'vin',
    'exp',
    'vehicleNumber',
    'mileage',
    'lastServiceDate',
    'typeOfService',
    'fuelType',
    'createdBy',
    'active',
    'licensePlate',
    'createdDate',
    'inMaintenance',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('vehicleInformation', mysqlService);
  }

  async getList(selectedViewType?: string): Promise<VehicleRow[]> {
    let sql = `
      select *
           , datediff(str_to_date(nullif(a.exp, ''), '%Y-%m-%d'), curdate()) expiresInDays
      from vehicleInformation a
    `;

    if (selectedViewType === 'Active') {
      sql += ' WHERE a.active = 1';
    } else if (selectedViewType === 'Inactive') {
      sql += ' WHERE a.active = 0';
    }

    return await this.rawQuery<VehicleRow>(sql);
  }

  async getAll(): Promise<VehicleRow[]> {
    return await this.rawQuery<VehicleRow>('SELECT * FROM vehicleInformation');
  }

  async getById(id: number): Promise<VehicleRow | null> {
    return await this.findOne({ id });
  }

  async findMany(filters: Record<string, unknown>): Promise<VehicleRow[]> {
    return await this.find(this.pickAllowedFilters(filters));
  }

  async findSingle(filters: Record<string, unknown>): Promise<VehicleRow | null> {
    return await this.findOne(this.pickAllowedFilters(filters));
  }

  async createVehicle(payload: Record<string, unknown>): Promise<number> {
    return await this.create(this.pickAllowedFilters(payload));
  }

  async updateVehicleById(id: number, payload: Record<string, unknown>): Promise<number> {
    const cleanPayload = this.pickAllowedFilters(payload);
    delete cleanPayload.id;
    if (Object.keys(cleanPayload).length === 0) {
      return 0;
    }
    return await this.updateById(id, cleanPayload);
  }

  async deleteVehicleById(id: number): Promise<number> {
    return await this.deleteById(id);
  }

  private pickAllowedFilters(input: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(input)) {
      if (this.allowedFilterColumns.has(key) && input[key] !== undefined) {
        result[key] = input[key];
      }
    }
    return result;
  }
}

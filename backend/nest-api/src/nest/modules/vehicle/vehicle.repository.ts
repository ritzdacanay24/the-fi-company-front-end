import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

export interface VehicleRow extends RowDataPacket {
  id: number;
  active: number;
}

interface VehicleFailureRow extends RowDataPacket {
  truck_license_plate: string;
  id: number;
  checklist_name: string;
  date_created: string;
  checklist_id: number;
}

export interface VehicleMaintenanceRow extends RowDataPacket {
  id: number;
  vehicle_id: number;
  service_date: string;
  mileage: number | null;
  service_type: string;
  description: string | null;
  vendor_name: string | null;
  cost: number | null;
  work_order_no: string | null;
  next_service_date: string | null;
  next_service_mileage: number | null;
  created_by: number;
  created_by_name: string | null;
  created_date: string;
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

  async checkAnyFailures(license: string): Promise<VehicleFailureRow[]> {
    return await this.rawQuery<VehicleFailureRow>(
      `
        SELECT a.truck_license_plate,
               b.id,
               b.checklist_name,
               a.date_created,
               a.id AS checklist_id
        FROM forms.vehicle_inspection_header a
        JOIN (
          SELECT forklift_checklist_id,
                 id,
                 checklist_name
          FROM forms.vehicle_inspection_details
          WHERE status = 0
            AND resolved_confirmed_date IS NULL
        ) b ON b.forklift_checklist_id = a.id
        WHERE a.truck_license_plate = ?
      `,
      [license],
    );
  }

  async getMaintenanceByVehicleId(vehicleId: number): Promise<VehicleMaintenanceRow[]> {
    const sql = `
      SELECT
        m.id,
        m.vehicle_id,
        m.service_date,
        m.mileage,
        m.service_type,
        m.description,
        m.vendor_name,
        m.cost,
        m.work_order_no,
        m.next_service_date,
        m.next_service_mileage,
        m.created_by,
        NULLIF(TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, ''))), '') AS created_by_name,
        m.created_date,
        m.active
      FROM vehicle_maintenance_history m
      LEFT JOIN db.users u ON u.id = m.created_by
      WHERE m.vehicle_id = ?
      ORDER BY m.service_date DESC, m.id DESC
    `;

    return await this.rawQuery<VehicleMaintenanceRow>(sql, [vehicleId]);
  }

  async createMaintenance(payload: {
    vehicle_id: number;
    service_date: string;
    mileage?: number | null;
    service_type: string;
    description?: string;
    vendor_name?: string;
    cost?: number | null;
    work_order_no?: string;
    next_service_date?: string;
    next_service_mileage?: number | null;
    created_by: number;
  }): Promise<number> {
    const sql = `
      INSERT INTO vehicle_maintenance_history (
        vehicle_id,
        service_date,
        mileage,
        service_type,
        description,
        vendor_name,
        cost,
        work_order_no,
        next_service_date,
        next_service_mileage,
        created_by,
        created_date,
        active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      payload.vehicle_id,
      payload.service_date,
      payload.mileage ?? null,
      payload.service_type,
      payload.description || null,
      payload.vendor_name || null,
      payload.cost ?? null,
      payload.work_order_no || null,
      payload.next_service_date || null,
      payload.next_service_mileage ?? null,
      payload.created_by,
    ]);

    return result.insertId;
  }

  async updateMaintenanceById(id: number, payload: {
    service_date?: string;
    mileage?: number | null;
    service_type?: string;
    description?: string;
    vendor_name?: string;
    cost?: number | null;
    work_order_no?: string;
    next_service_date?: string;
    next_service_mileage?: number | null;
    active?: number;
  }): Promise<number> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (payload.service_date !== undefined) {
      updates.push('service_date = ?');
      values.push(payload.service_date);
    }

    if (payload.mileage !== undefined) {
      updates.push('mileage = ?');
      values.push(payload.mileage);
    }

    if (payload.service_type !== undefined) {
      updates.push('service_type = ?');
      values.push(payload.service_type);
    }

    if (payload.description !== undefined) {
      updates.push('description = ?');
      values.push(payload.description || null);
    }

    if (payload.vendor_name !== undefined) {
      updates.push('vendor_name = ?');
      values.push(payload.vendor_name || null);
    }

    if (payload.cost !== undefined) {
      updates.push('cost = ?');
      values.push(payload.cost ?? null);
    }

    if (payload.work_order_no !== undefined) {
      updates.push('work_order_no = ?');
      values.push(payload.work_order_no || null);
    }

    if (payload.next_service_date !== undefined) {
      updates.push('next_service_date = ?');
      values.push(payload.next_service_date || null);
    }

    if (payload.next_service_mileage !== undefined) {
      updates.push('next_service_mileage = ?');
      values.push(payload.next_service_mileage ?? null);
    }

    if (payload.active !== undefined) {
      updates.push('active = ?');
      values.push(payload.active);
    }

    if (updates.length === 0) {
      return 0;
    }

    const sql = `
      UPDATE vehicle_maintenance_history
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [...values, id]);
    return result.affectedRows;
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

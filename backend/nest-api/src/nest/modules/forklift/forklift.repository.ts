import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

export interface ForkliftRow extends RowDataPacket {
  id: number;
  forklift_type: string | null;
  unit_number: string | null;
  model_name: string | null;
  serial_number: string | null;
  department: string | null;
  fuel_type: string | null;
  year: string | null;
  created_by: number;
  created_date: string;
  active: number;
}

export interface ForkliftMaintenanceRow extends RowDataPacket {
  id: number;
  forklift_id: number;
  service_date: string;
  hour_meter: number | null;
  service_type: string;
  description: string | null;
  vendor_name: string | null;
  cost: number | null;
  work_order_no: string | null;
  next_service_date: string | null;
  next_service_hour_meter: number | null;
  created_by: number;
  created_by_name: string | null;
  created_date: string;
  active: number;
}

@Injectable()
export class ForkliftRepository extends BaseRepository<ForkliftRow> {
  private readonly allowedFilterColumns = new Set([
    'id',
    'forklift_type',
    'unit_number',
    'model_name',
    'serial_number',
    'department',
    'fuel_type',
    'year',
    'created_by',
    'created_date',
    'active',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('forklift_information', mysqlService);
  }

  async getList(selectedViewType?: string): Promise<ForkliftRow[]> {
    let sql = `
      SELECT *
      FROM forklift_information
    `;

    if (selectedViewType === 'Active') {
      sql += ' WHERE active = 1';
    } else if (selectedViewType === 'Inactive') {
      sql += ' WHERE active = 0';
    }

    sql += ' ORDER BY unit_number ASC, id DESC';

    return await this.rawQuery<ForkliftRow>(sql);
  }

  async getAll(): Promise<ForkliftRow[]> {
    return await this.rawQuery<ForkliftRow>('SELECT * FROM forklift_information ORDER BY unit_number ASC, id DESC');
  }

  async getById(id: number): Promise<ForkliftRow | null> {
    return await this.findOne({ id });
  }

  async findMany(filters: Record<string, unknown>): Promise<ForkliftRow[]> {
    return await this.find(this.pickAllowedFilters(filters));
  }

  async findSingle(filters: Record<string, unknown>): Promise<ForkliftRow | null> {
    return await this.findOne(this.pickAllowedFilters(filters));
  }

  async createForklift(payload: Record<string, unknown>): Promise<number> {
    return await this.create(this.pickAllowedFilters(payload));
  }

  async updateForkliftById(id: number, payload: Record<string, unknown>): Promise<number> {
    const cleanPayload = this.pickAllowedFilters(payload);
    delete cleanPayload.id;
    if (Object.keys(cleanPayload).length === 0) {
      return 0;
    }
    return await this.updateById(id, cleanPayload);
  }

  async deleteForkliftById(id: number): Promise<number> {
    return await this.deleteById(id);
  }

  async getMaintenanceByForkliftId(forkliftId: number): Promise<ForkliftMaintenanceRow[]> {
    const sql = `
      SELECT
        m.id,
        m.forklift_id,
        m.service_date,
        m.hour_meter,
        m.service_type,
        m.description,
        m.vendor_name,
        m.cost,
        m.work_order_no,
        m.next_service_date,
        m.next_service_hour_meter,
        m.created_by,
        NULLIF(TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, ''))), '') AS created_by_name,
        m.created_date,
        m.active
      FROM forklift_maintenance_history m
      LEFT JOIN db.users u ON u.id = m.created_by
      WHERE m.forklift_id = ?
      ORDER BY m.service_date DESC, m.id DESC
    `;

    return await this.rawQuery<ForkliftMaintenanceRow>(sql, [forkliftId]);
  }

  async createMaintenance(payload: {
    forklift_id: number;
    service_date: string;
    hour_meter?: number | null;
    service_type: string;
    description?: string;
    vendor_name?: string;
    cost?: number | null;
    work_order_no?: string;
    next_service_date?: string;
    next_service_hour_meter?: number | null;
    created_by: number;
  }): Promise<number> {
    const sql = `
      INSERT INTO forklift_maintenance_history (
        forklift_id,
        service_date,
        hour_meter,
        service_type,
        description,
        vendor_name,
        cost,
        work_order_no,
        next_service_date,
        next_service_hour_meter,
        created_by,
        created_date,
        active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      payload.forklift_id,
      payload.service_date,
      payload.hour_meter ?? null,
      payload.service_type,
      payload.description || null,
      payload.vendor_name || null,
      payload.cost ?? null,
      payload.work_order_no || null,
      payload.next_service_date || null,
      payload.next_service_hour_meter ?? null,
      payload.created_by,
    ]);

    return result.insertId;
  }

  async updateMaintenanceById(id: number, payload: {
    service_date?: string;
    hour_meter?: number | null;
    service_type?: string;
    description?: string;
    vendor_name?: string;
    cost?: number | null;
    work_order_no?: string;
    next_service_date?: string;
    next_service_hour_meter?: number | null;
    active?: number;
  }): Promise<number> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (payload.service_date !== undefined) {
      updates.push('service_date = ?');
      values.push(payload.service_date);
    }
    if (payload.hour_meter !== undefined) {
      updates.push('hour_meter = ?');
      values.push(payload.hour_meter);
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
    if (payload.next_service_hour_meter !== undefined) {
      updates.push('next_service_hour_meter = ?');
      values.push(payload.next_service_hour_meter ?? null);
    }
    if (payload.active !== undefined) {
      updates.push('active = ?');
      values.push(payload.active);
    }

    if (updates.length === 0) {
      return 0;
    }

    const sql = `
      UPDATE forklift_maintenance_history
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

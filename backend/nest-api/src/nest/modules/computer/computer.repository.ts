import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

export interface ComputerRow extends RowDataPacket {
  id: number;
  computer_type: string | null;
  asset_tag: string | null;
  computer_name: string | null;
  model_name: string | null;
  serial_number: string | null;
  department: string | null;
  assigned_to: string | null;
  operating_system: string | null;
  created_by: number;
  created_date: string;
  active: number;
}

export interface ComputerMaintenanceRow extends RowDataPacket {
  id: number;
  computer_id: number;
  service_date: string;
  usage_hours: number | null;
  service_type: string;
  description: string | null;
  vendor_name: string | null;
  cost: number | null;
  ticket_no: string | null;
  next_service_date: string | null;
  next_service_usage_hours: number | null;
  created_by: number;
  created_by_name: string | null;
  created_date: string;
  active: number;
}

export interface ComputerInspectionOptionRow extends RowDataPacket {
  group_name: string;
  unit_name: string;
}

interface NextAssetTagRow extends RowDataPacket {
  next_number: number | null;
}

@Injectable()
export class ComputerRepository extends BaseRepository<ComputerRow> {
  private readonly allowedFilterColumns = new Set([
    'id',
    'computer_type',
    'asset_tag',
    'computer_name',
    'model_name',
    'serial_number',
    'department',
    'assigned_to',
    'operating_system',
    'created_by',
    'created_date',
    'active',
    'include_in_inspection_report',
  ]);

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('computer_information', mysqlService);
  }

  async getList(selectedViewType?: string): Promise<ComputerRow[]> {
    let sql = `
      SELECT *
      FROM computer_information
    `;

    if (selectedViewType === 'Active') {
      sql += ' WHERE active = 1';
    } else if (selectedViewType === 'Inactive') {
      sql += ' WHERE active = 0';
    }

    sql += ' ORDER BY asset_tag ASC, id DESC';

    return await this.rawQuery<ComputerRow>(sql);
  }

  async getAll(): Promise<ComputerRow[]> {
    return await this.rawQuery<ComputerRow>('SELECT * FROM computer_information ORDER BY asset_tag ASC, id DESC');
  }

  async getById(id: number): Promise<ComputerRow | null> {
    return await this.findOne({ id });
  }

  async findMany(filters: Record<string, unknown>): Promise<ComputerRow[]> {
    return await this.find(this.pickAllowedFilters(filters));
  }

  async findSingle(filters: Record<string, unknown>): Promise<ComputerRow | null> {
    return await this.findOne(this.pickAllowedFilters(filters));
  }

  async createComputer(payload: Record<string, unknown>): Promise<number> {
    return await this.create(this.pickAllowedFilters(payload));
  }

  async generateNextAssetTag(prefix: string): Promise<string> {
    const safePrefix = String(prefix || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 2) || 'CP';

    const sql = `
      SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(asset_tag, '-', -1) AS UNSIGNED)), 0) + 1 AS next_number
      FROM computer_information
      WHERE asset_tag LIKE CONCAT('EY-', ?, '-%')
    `;

    const rows = await this.rawQuery<NextAssetTagRow>(sql, [safePrefix]);
    const nextNumber = Number(rows?.[0]?.next_number || 1);
    const padded = String(nextNumber).padStart(4, '0');
    return `EY-${safePrefix}-${padded}`;
  }

  async updateComputerById(id: number, payload: Record<string, unknown>): Promise<number> {
    const cleanPayload = this.pickAllowedFilters(payload);
    delete cleanPayload.id;
    if (Object.keys(cleanPayload).length === 0) {
      return 0;
    }
    return await this.updateById(id, cleanPayload);
  }

  async deleteComputerById(id: number): Promise<number> {
    return await this.deleteById(id);
  }

  async getInspectionOptions(): Promise<ComputerInspectionOptionRow[]> {
    const sql = `
      SELECT
        COALESCE(NULLIF(TRIM(computer_type), ''), 'Other Computers') AS group_name,
        UPPER(TRIM(asset_tag)) AS unit_name
      FROM computer_information
      WHERE active = 1
        AND NULLIF(TRIM(asset_tag), '') IS NOT NULL
      GROUP BY
        COALESCE(NULLIF(TRIM(computer_type), ''), 'Other Computers'),
        UPPER(TRIM(asset_tag))
      ORDER BY
        COALESCE(NULLIF(TRIM(computer_type), ''), 'Other Computers') ASC,
        UPPER(TRIM(asset_tag)) ASC
    `;

    return await this.rawQuery<ComputerInspectionOptionRow>(sql);
  }

  async getMaintenanceByComputerId(computerId: number): Promise<ComputerMaintenanceRow[]> {
    const sql = `
      SELECT
        m.id,
        m.computer_id,
        m.service_date,
        m.usage_hours,
        m.service_type,
        m.description,
        m.vendor_name,
        m.cost,
        m.ticket_no,
        m.next_service_date,
        m.next_service_usage_hours,
        m.created_by,
        NULLIF(TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, ''))), '') AS created_by_name,
        m.created_date,
        m.active
      FROM computer_maintenance_history m
      LEFT JOIN db.users u ON u.id = m.created_by
      WHERE m.computer_id = ?
      ORDER BY m.service_date DESC, m.id DESC
    `;

    return await this.rawQuery<ComputerMaintenanceRow>(sql, [computerId]);
  }

  async createMaintenance(payload: {
    computer_id: number;
    service_date: string;
    usage_hours?: number | null;
    service_type: string;
    description?: string;
    vendor_name?: string;
    cost?: number | null;
    ticket_no?: string;
    next_service_date?: string;
    next_service_usage_hours?: number | null;
    created_by: number;
  }): Promise<number> {
    const sql = `
      INSERT INTO computer_maintenance_history (
        computer_id,
        service_date,
        usage_hours,
        service_type,
        description,
        vendor_name,
        cost,
        ticket_no,
        next_service_date,
        next_service_usage_hours,
        created_by,
        created_date,
        active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      payload.computer_id,
      payload.service_date,
      payload.usage_hours ?? null,
      payload.service_type,
      payload.description || null,
      payload.vendor_name || null,
      payload.cost ?? null,
      payload.ticket_no || null,
      payload.next_service_date || null,
      payload.next_service_usage_hours ?? null,
      payload.created_by,
    ]);

    return result.insertId;
  }

  async updateMaintenanceById(id: number, payload: {
    service_date?: string;
    usage_hours?: number | null;
    service_type?: string;
    description?: string;
    vendor_name?: string;
    cost?: number | null;
    ticket_no?: string;
    next_service_date?: string;
    next_service_usage_hours?: number | null;
    active?: number;
  }): Promise<number> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (payload.service_date !== undefined) {
      updates.push('service_date = ?');
      values.push(payload.service_date);
    }
    if (payload.usage_hours !== undefined) {
      updates.push('usage_hours = ?');
      values.push(payload.usage_hours);
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
    if (payload.ticket_no !== undefined) {
      updates.push('ticket_no = ?');
      values.push(payload.ticket_no || null);
    }
    if (payload.next_service_date !== undefined) {
      updates.push('next_service_date = ?');
      values.push(payload.next_service_date || null);
    }
    if (payload.next_service_usage_hours !== undefined) {
      updates.push('next_service_usage_hours = ?');
      values.push(payload.next_service_usage_hours ?? null);
    }
    if (payload.active !== undefined) {
      updates.push('active = ?');
      values.push(payload.active);
    }

    if (updates.length === 0) {
      return 0;
    }

    const sql = `
      UPDATE computer_maintenance_history
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

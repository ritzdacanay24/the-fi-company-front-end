import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface VehicleInspectionHeaderRow extends RowDataPacket {
  id: number;
  date_created: string;
  truck_license_plate: string;
  comments: string;
  created_by: string;
  mileage: string | null;
  not_used: number;
}

@Injectable()
export class VehicleInspectionRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getList(): Promise<RowDataPacket[]> {
    const sql = `
      SELECT a.*
           , total_count
           , failed_count
           , TRUNCATE(passed_count / total_count * 100, 2) percent
           , passed_count
           , confirmed_resolved_count
      FROM forms.vehicle_inspection_header a
      LEFT JOIN (
        SELECT forklift_checklist_id
             , COUNT(id) total_count
             , SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) failed_count
             , SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) passed_count
             , SUM(CASE WHEN status = 0 AND resolved_confirmed_date IS NULL THEN 1 ELSE 0 END) confirmed_resolved_count
        FROM forms.vehicle_inspection_details
        GROUP BY forklift_checklist_id
      ) b ON b.forklift_checklist_id = a.id
      ORDER BY a.date_created DESC
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql);
  }

  async getHeaderById(id: number): Promise<VehicleInspectionHeaderRow | null> {
    const sql = `
      SELECT a.*, b.vehicleMake, b.vehicleNumber, b.inMaintenance
      FROM forms.vehicle_inspection_header a
      LEFT JOIN vehicleInformation b ON b.licensePlate = a.truck_license_plate
      WHERE a.id = ?
    `;

    const rows = await this.mysqlService.query<VehicleInspectionHeaderRow[]>(sql, [id]);
    return rows[0] || null;
  }

  async getDetailsByInspectionId(id: number): Promise<RowDataPacket[]> {
    const sql = `
      SELECT *
      FROM forms.vehicle_inspection_details
      WHERE forklift_checklist_id = ?
      ORDER BY group_name ASC
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [id]);
  }

  async getDetailById(id: number): Promise<RowDataPacket | null> {
    const sql = `
      SELECT *
      FROM forms.vehicle_inspection_details
      WHERE id = ?
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [id]);
    return rows[0] || null;
  }

  async getAttachmentsByInspectionId(id: number): Promise<RowDataPacket[]> {
    const sql = `
      SELECT *
      FROM eyefidb.attachments
      WHERE field = 'Vehicle Inspection'
        AND uniqueId = ?
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [id]);
  }

  async saveDetailById(id: number, payload: Record<string, any>): Promise<number> {
    const resolvedByDate = payload.resolved_by_date ? payload.resolved_by_date : null;
    const resolvedConfirmedDate = payload.resolved_confirmed_date ? payload.resolved_confirmed_date : null;

    const sql = `
      UPDATE forms.vehicle_inspection_details
      SET resolved_by = ?
        , resolved_by_date = ?
        , resolved_by_notes = ?
        , resolved_confirmed_by = ?
        , resolved_confirmed_date = ?
        , resolved_confirmed_notes = ?
      WHERE id = ?
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      payload.resolved_by ?? null,
      resolvedByDate,
      payload.resolved_by_notes ?? null,
      payload.resolved_confirmed_by ?? null,
      resolvedConfirmedDate,
      payload.resolved_confirmed_notes ?? null,
      id,
    ]);

    return result.affectedRows;
  }

  async createHeader(payload: {
    date_created: string;
    truck_license_plate: string;
    created_by: string;
    comments: string;
    mileage: string | null;
    not_used: number;
  }): Promise<number> {
    const sql = `
      INSERT INTO forms.vehicle_inspection_header (
        date_created,
        truck_license_plate,
        created_by,
        comments,
        mileage,
        not_used
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      payload.date_created,
      payload.truck_license_plate,
      payload.created_by,
      payload.comments,
      payload.mileage,
      payload.not_used,
    ]);

    return result.insertId;
  }

  async insertDetail(payload: {
    group_name: string;
    checklist_name: string;
    status: number | string;
    forklift_checklist_id: number;
  }): Promise<number> {
    const sql = `
      INSERT INTO forms.vehicle_inspection_details (
        group_name,
        checklist_name,
        status,
        forklift_checklist_id
      ) VALUES (?, ?, ?, ?)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      payload.group_name,
      payload.checklist_name,
      payload.status,
      payload.forklift_checklist_id,
    ]);

    return result.insertId;
  }
}

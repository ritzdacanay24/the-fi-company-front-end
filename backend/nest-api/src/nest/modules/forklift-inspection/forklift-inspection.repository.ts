import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '../../../shared/database/mysql.service';

export interface ForkliftChecklistRow extends RowDataPacket {
  id: number;
  date_created: string;
  department: string;
  operator: string;
  model_number: string;
  shift: string;
  comments: string;
}

@Injectable()
export class ForkliftInspectionRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getList(): Promise<RowDataPacket[]> {
    const sql = `
      SELECT a.*
           , total_count
           , failed_count
           , TRUNCATE(passed_count / total_count * 100, 2) percent
           , passed_count
      FROM forms.forklift_checklist a
      LEFT JOIN (
        SELECT forklift_checklist_id
             , COUNT(id) total_count
             , SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) failed_count
             , SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) passed_count
        FROM forms.forklift_checklist_details
        GROUP BY forklift_checklist_id
      ) b ON b.forklift_checklist_id = a.id
      ORDER BY a.date_created DESC
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql);
  }

  async getHeaderById(id: number): Promise<ForkliftChecklistRow | null> {
    const sql = `SELECT * FROM forms.forklift_checklist WHERE id = ?`;
    const rows = await this.mysqlService.query<ForkliftChecklistRow[]>(sql, [id]);
    return rows[0] || null;
  }

  async getDetailsByChecklistId(id: number): Promise<RowDataPacket[]> {
    const sql = `SELECT * FROM forms.forklift_checklist_details WHERE forklift_checklist_id = ?`;
    return this.mysqlService.query<RowDataPacket[]>(sql, [id]);
  }

  async createHeader(payload: {
    date_created: string;
    department: string;
    operator: string;
    model_number: string;
    shift: string;
    comments: string;
  }): Promise<number> {
    const sql = `
      INSERT INTO forms.forklift_checklist (
        date_created,
        department,
        operator,
        model_number,
        shift,
        comments
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      payload.date_created,
      payload.department,
      payload.operator,
      payload.model_number,
      payload.shift,
      payload.comments,
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
      INSERT INTO forms.forklift_checklist_details (
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

  async updateHeaderById(id: number, payload: Record<string, unknown>): Promise<number> {
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of ['date_created', 'department', 'operator', 'model_number', 'shift', 'comments']) {
      const value = payload[key as keyof ForkliftChecklistRow];
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return 0;
    }

    const sql = `UPDATE forms.forklift_checklist SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [...values, id]);
    return result.affectedRows;
  }

  async deleteDetailsByChecklistId(id: number): Promise<number> {
    const sql = `DELETE FROM forms.forklift_checklist_details WHERE forklift_checklist_id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [id]);
    return result.affectedRows;
  }

  async deleteHeaderById(id: number): Promise<number> {
    const sql = `DELETE FROM forms.forklift_checklist WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [id]);
    return result.affectedRows;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class PhotoChecklistRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getTemplates(): Promise<RowDataPacket[]> {
    const sql = `
      SELECT t.*,
        COALESCE(i.item_count, 0) AS item_count,
        COALESCE(a.active_instances, 0) AS active_instances
      FROM checklist_templates t
      LEFT JOIN (
        SELECT template_id, COUNT(*) AS item_count
        FROM checklist_items
        GROUP BY template_id
      ) i ON i.template_id = t.id
      LEFT JOIN (
        SELECT template_id, COUNT(*) AS active_instances
        FROM checklist_instances
        WHERE status IN ('draft', 'in_progress', 'review')
        GROUP BY template_id
      ) a ON a.template_id = t.id
      ORDER BY t.updated_at DESC
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql);
  }

  async getTemplateById(id: number): Promise<RowDataPacket | null> {
    const sql = `
      SELECT t.*,
        COALESCE(i.item_count, 0) AS item_count,
        COALESCE(a.active_instances, 0) AS active_instances
      FROM checklist_templates t
      LEFT JOIN (
        SELECT template_id, COUNT(*) AS item_count
        FROM checklist_items
        GROUP BY template_id
      ) i ON i.template_id = t.id
      LEFT JOIN (
        SELECT template_id, COUNT(*) AS active_instances
        FROM checklist_instances
        WHERE status IN ('draft', 'in_progress', 'review')
        GROUP BY template_id
      ) a ON a.template_id = t.id
      WHERE t.id = ?
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [id]);
    return rows[0] || null;
  }

  async getTemplateItems(templateId: number): Promise<RowDataPacket[]> {
    const sql = `
      SELECT *
      FROM checklist_items
      WHERE template_id = ?
      ORDER BY order_index ASC
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [templateId]);
  }

  async getInstances(filters?: { status?: string; workOrder?: string }): Promise<RowDataPacket[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.status) {
      conditions.push('ci.status = ?');
      params.push(filters.status);
    }

    if (filters?.workOrder) {
      conditions.push('ci.work_order_number LIKE ?');
      params.push(`%${filters.workOrder}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT ci.*, t.name AS template_name, t.description AS template_description,
        t.version AS template_version, t.category AS template_category
      FROM checklist_instances ci
      INNER JOIN checklist_templates t ON t.id = ci.template_id
      ${whereClause}
      ORDER BY ci.updated_at DESC
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, params);
  }

  async createInstance(payload: {
    template_id: number;
    work_order_number: string;
    part_number?: string;
    serial_number?: string;
    operator_id?: number | null;
    operator_name?: string;
    status?: string;
  }): Promise<number> {
    const sql = `
      INSERT INTO checklist_instances (
        template_id, work_order_number, part_number, serial_number,
        operator_id, operator_name, status, progress_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      payload.template_id,
      payload.work_order_number,
      payload.part_number || null,
      payload.serial_number || null,
      payload.operator_id ?? null,
      payload.operator_name || null,
      payload.status || 'draft',
      0,
    ]);

    return result.insertId;
  }
}

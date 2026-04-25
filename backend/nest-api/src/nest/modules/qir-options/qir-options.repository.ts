import { Inject, Injectable } from '@nestjs/common';
import { OkPacket, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class QirOptionsRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  /**
   * Returns all active options grouped by category slug.
   * Shape matches old qir_settings.find({ active: 1 }) so the frontend
   * grouping code (element.category) works without changes.
   */
  async getFormSettings(): Promise<RowDataPacket[]> {
    return this.mysqlService.execute<RowDataPacket[]>(`
      SELECT
        o.id,
        c.slug       AS category,
        o.name,
        o.code,
        o.description,
        o.sort_order AS sortOrder,
        o.active,
        o.show_in_public AS showInPublic
      FROM qir_options o
      JOIN qir_option_categories c ON c.id = o.category_id
      WHERE o.active = 1 AND c.active = 1
      ORDER BY c.sort_order, o.name
    `);
  }

  async getCategories(): Promise<RowDataPacket[]> {
    return this.mysqlService.execute<RowDataPacket[]>(`
      SELECT id, slug, label, description, sort_order, active, created_at
      FROM qir_option_categories
      ORDER BY sort_order, label
    `);
  }

  async getOptions(filters: { category_id?: number; active?: number }): Promise<RowDataPacket[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.category_id !== undefined) {
      conditions.push('o.category_id = ?');
      params.push(filters.category_id);
    }
    if (filters.active !== undefined) {
      conditions.push('o.active = ?');
      params.push(filters.active);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.mysqlService.execute<RowDataPacket[]>(
      `SELECT
        o.id, o.category_id, c.slug AS category, c.label AS category_label,
        o.name, o.code, o.description, o.show_in_public, o.sort_order,
        o.active, o.created_at, o.updated_at, o.created_by
       FROM qir_options o
       JOIN qir_option_categories c ON c.id = o.category_id
       ${where}
       ORDER BY c.sort_order, o.sort_order, o.name`,
      params,
    );
  }

  async getOptionById(id: number): Promise<RowDataPacket | null> {
    const rows = await this.mysqlService.execute<RowDataPacket[]>(
      `SELECT o.*, c.slug AS category, c.label AS category_label
       FROM qir_options o
       JOIN qir_option_categories c ON c.id = o.category_id
       WHERE o.id = ?`,
      [id],
    );
    return rows[0] ?? null;
  }

  async createOption(payload: {
    category_id: number;
    name: string;
    code?: string | null;
    description?: string | null;
    show_in_public?: number;
    sort_order?: number;
    active?: number;
    created_by?: number | null;
  }): Promise<number> {
    const result = await this.mysqlService.execute<OkPacket>(
      `INSERT INTO qir_options (category_id, name, code, description, show_in_public, sort_order, active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.category_id,
        payload.name,
        payload.code ?? null,
        payload.description ?? null,
        payload.show_in_public ?? 1,
        payload.sort_order ?? 0,
        payload.active ?? 1,
        payload.created_by ?? null,
      ],
    );
    return (result as any).insertId;
  }

  async updateOption(
    id: number,
    payload: Partial<{
      name: string;
      code: string | null;
      description: string | null;
      show_in_public: number;
      sort_order: number;
      active: number;
      created_by: number | null;
    }>,
  ): Promise<number> {
    const allowed = ['name', 'code', 'description', 'show_in_public', 'sort_order', 'active', 'created_by'];
    const entries = Object.entries(payload).filter(([k]) => allowed.includes(k));
    if (entries.length === 0) return 0;

    const setClauses = entries.map(([k]) => `${k} = ?`).join(', ');
    const values = [...entries.map(([, v]) => v), id];

    const result = await this.mysqlService.execute<OkPacket>(
      `UPDATE qir_options SET ${setClauses} WHERE id = ?`,
      values,
    );
    return (result as any).affectedRows;
  }

  async deleteOption(id: number): Promise<number> {
    const result = await this.mysqlService.execute<OkPacket>(
      `DELETE FROM qir_options WHERE id = ?`,
      [id],
    );
    return (result as any).affectedRows;
  }

  async updateCategory(
    id: number,
    payload: Partial<{ label: string; description: string | null; sort_order: number; active: number }>,
  ): Promise<number> {
    const allowed = ['label', 'description', 'sort_order', 'active'];
    const entries = Object.entries(payload).filter(([k]) => allowed.includes(k));
    if (entries.length === 0) return 0;

    const setClauses = entries.map(([k]) => `${k} = ?`).join(', ');
    const values = [...entries.map(([, v]) => v), id];

    const result = await this.mysqlService.execute<OkPacket>(
      `UPDATE qir_option_categories SET ${setClauses} WHERE id = ?`,
      values,
    );
    return (result as any).affectedRows;
  }
}

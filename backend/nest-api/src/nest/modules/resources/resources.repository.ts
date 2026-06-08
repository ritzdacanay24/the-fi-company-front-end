import { Injectable } from '@nestjs/common';
import { ResultSetHeader } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export type ResourceRow = {
  id: number;
  category: string;
  title: string;
  description: string | null;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  link: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  active: number;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateResourcePayload = {
  category: string;
  title: string;
  description?: string | null;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  link: string;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
  active?: number;
  createdBy?: number | null;
  createdByName?: string | null;
};

export type UpdateResourcePayload = Partial<CreateResourcePayload>;

@Injectable()
export class ResourcesRepository {
  constructor(private readonly mysqlService: MysqlService) {}

  async list(activeOnly = true): Promise<ResourceRow[]> {
    const where = activeOnly ? 'WHERE active = 1' : '';
    return this.mysqlService.query<ResourceRow[]>(`
      SELECT
        id,
        category,
        title,
        description,
        file_name,
        mime_type,
        size_bytes,
        link,
        icon,
        color,
        sort_order,
        active,
        created_by,
        created_by_name,
        created_at,
        updated_at
      FROM app_resources
      ${where}
      ORDER BY category ASC, sort_order ASC, title ASC
    `);
  }

  async findById(id: number): Promise<ResourceRow | null> {
    const rows = await this.mysqlService.query<ResourceRow[]>(
      `
      SELECT
        id,
        category,
        title,
        description,
        file_name,
        mime_type,
        size_bytes,
        link,
        icon,
        color,
        sort_order,
        active,
        created_by,
        created_by_name,
        created_at,
        updated_at
      FROM app_resources
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  async create(payload: CreateResourcePayload): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `
      INSERT INTO app_resources (
        category,
        title,
        description,
        file_name,
        mime_type,
        size_bytes,
        link,
        icon,
        color,
        sort_order,
        active,
        created_by,
        created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.category,
        payload.title,
        payload.description ?? null,
        payload.fileName,
        payload.mimeType ?? null,
        payload.sizeBytes ?? null,
        payload.link,
        payload.icon ?? 'ri-file-pdf-line',
        payload.color ?? '#dc3545',
        payload.sortOrder ?? 0,
        payload.active ?? 1,
        payload.createdBy ?? null,
        payload.createdByName ?? null,
      ],
    );

    return Number(result.insertId || 0);
  }

  async update(id: number, payload: UpdateResourcePayload): Promise<number> {
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    const push = (field: string, value: string | number | null | undefined) => {
      if (value === undefined) {
        return;
      }
      fields.push(`${field} = ?`);
      values.push(value);
    };

    push('category', payload.category);
    push('title', payload.title);
    push('description', payload.description === undefined ? undefined : payload.description ?? null);
    push('file_name', payload.fileName);
    push('mime_type', payload.mimeType === undefined ? undefined : payload.mimeType ?? null);
    push('size_bytes', payload.sizeBytes === undefined ? undefined : payload.sizeBytes ?? null);
    push('link', payload.link);
    push('icon', payload.icon === undefined ? undefined : payload.icon ?? null);
    push('color', payload.color === undefined ? undefined : payload.color ?? null);
    push('sort_order', payload.sortOrder);
    push('active', payload.active);

    if (!fields.length) {
      return 0;
    }

    values.push(id);

    const result = await this.mysqlService.execute<ResultSetHeader>(
      `UPDATE app_resources SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );

    return Number(result.affectedRows || 0);
  }
}

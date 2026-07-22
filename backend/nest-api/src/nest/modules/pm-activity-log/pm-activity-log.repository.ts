import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export type ActivityEntityType = 'project' | 'gate' | 'task';

export interface ActivityLogRow extends RowDataPacket {
  id: number;
  project_id: string;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  user_id: number | null;
  user_name: string | null;
  created_at: string;
}

export interface InsertActivityLogDto {
  projectId: string;
  entityType: ActivityEntityType;
  entityId?: string | null;
  action: string;
  fieldName?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  userId?: number | null;
  userName?: string | null;
}

const TABLE = 'pm_activity_log';

@Injectable()
export class PmActivityLogRepository {
  private readonly userNameCache = new Map<number, string>();

  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async resolveUserName(userId: number | null | undefined): Promise<string | null> {
    const id = Number(userId || 0);
    if (!Number.isFinite(id) || id <= 0) return null;

    if (this.userNameCache.has(id)) {
      return this.userNameCache.get(id)!;
    }

    const rows = await this.mysqlService.query<Array<RowDataPacket & { display_name: string }>>(
      `SELECT TRIM(CONCAT(COALESCE(first, ''), ' ', COALESCE(last, ''))) AS display_name
       FROM db.users WHERE id = ? LIMIT 1`,
      [id],
    );

    const name = String(rows[0]?.display_name || '').trim() || null;
    if (name) this.userNameCache.set(id, name);
    return name;
  }

  async insert(dto: InsertActivityLogDto): Promise<void> {
    const oldVal = dto.oldValue !== undefined && dto.oldValue !== null
      ? String(dto.oldValue)
      : null;
    const newVal = dto.newValue !== undefined && dto.newValue !== null
      ? String(dto.newValue)
      : null;

    await this.mysqlService.query(
      `INSERT INTO ${TABLE}
         (project_id, entity_type, entity_id, action, field_name, old_value, new_value, user_id, user_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.projectId,
        dto.entityType,
        dto.entityId ?? null,
        dto.action,
        dto.fieldName ?? null,
        oldVal,
        newVal,
        dto.userId ?? null,
        dto.userName ?? null,
      ],
    );
  }

  async insertMany(entries: InsertActivityLogDto[]): Promise<void> {
    for (const entry of entries) {
      await this.insert(entry);
    }
  }

  async findByProject(
    projectId: string,
    filters: { entityType?: ActivityEntityType; entityId?: string; limit?: number } = {},
  ): Promise<ActivityLogRow[]> {
    const conditions: string[] = ['project_id = ?'];
    const params: unknown[] = [projectId];

    if (filters.entityType) {
      conditions.push('entity_type = ?');
      params.push(filters.entityType);
    }

    if (filters.entityId !== undefined) {
      conditions.push('entity_id = ?');
      params.push(filters.entityId);
    }

    const limit = Math.min(filters.limit ?? 200, 500);

    return this.mysqlService.query<ActivityLogRow[]>(
      `SELECT * FROM ${TABLE}
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ${limit}`,
      params,
    );
  }
}

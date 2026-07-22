import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export interface FavoriteRow extends RowDataPacket {
  id: number;
  user_id: number;
  path: string;
  label: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

const TABLE = 'user_favorites';

@Injectable()
export class FavoritesRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async listByUserId(userId: number): Promise<FavoriteRow[]> {
    return this.mysqlService.query<FavoriteRow[]>(
      `SELECT id, user_id, path, label, icon, sort_order, created_at
       FROM ${TABLE}
       WHERE user_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [userId],
    );
  }

  async findByUserIdAndPath(userId: number, path: string): Promise<FavoriteRow | null> {
    const rows = await this.mysqlService.query<FavoriteRow[]>(
      `SELECT id, user_id, path, label, icon, sort_order, created_at
       FROM ${TABLE}
       WHERE user_id = ? AND path = ?
       LIMIT 1`,
      [userId, path],
    );

    return rows[0] ?? null;
  }

  async create(
    userId: number,
    path: string,
    label: string,
    icon: string,
    sortOrder: number,
  ): Promise<void> {
    await this.mysqlService.query(
      `INSERT INTO ${TABLE} (user_id, path, label, icon, sort_order)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         label      = VALUES(label),
         icon       = VALUES(icon),
         sort_order = VALUES(sort_order)`,
      [userId, path, label, icon, sortOrder],
    );
  }

  async removeByPath(userId: number, path: string): Promise<void> {
    await this.mysqlService.query(
      `DELETE FROM ${TABLE} WHERE user_id = ? AND path = ?`,
      [userId, path],
    );
  }

  async clearByUserId(userId: number): Promise<void> {
    await this.mysqlService.query(
      `DELETE FROM ${TABLE} WHERE user_id = ?`,
      [userId],
    );
  }

  async countByUserId(userId: number): Promise<number> {
    const rows = await this.mysqlService.query<Array<RowDataPacket & { cnt: number }>>(
      `SELECT COUNT(*) AS cnt FROM ${TABLE} WHERE user_id = ?`,
      [userId],
    );

    return rows[0]?.cnt ?? 0;
  }

  async reorder(userId: number, orderedPaths: string[]): Promise<void> {
    if (orderedPaths.length === 0) return;

    const cases = orderedPaths.map((_, i) => `WHEN ? THEN ${i}`).join(' ');
    const params: (string | number)[] = [];
    orderedPaths.forEach((path) => params.push(path));
    params.push(userId);

    await this.mysqlService.query(
      `UPDATE ${TABLE}
       SET sort_order = CASE path ${cases} ELSE sort_order END
       WHERE user_id = ?`,
      params,
    );
  }
}

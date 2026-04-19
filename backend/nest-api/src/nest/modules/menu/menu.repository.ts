import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

export interface MenuRecord extends RowDataPacket {
  id: number;
  parent_id: number | null;
  label: string | null;
  icon: string | null;
  link: string | null;
  description: string | null;
  isCollapsed: number | null;
  accessRequired: number;
  badge: unknown;
  isTitle: number | null;
  hideCheckBox: string | null;
  active: number;
  seq: number | null;
  activatedRoutes: string | null;
}

const ALLOWED_COLUMNS = new Set([
  'parent_id', 'label', 'icon', 'link', 'description', 'isCollapsed',
  'accessRequired', 'badge', 'isTitle', 'hideCheckBox', 'active', 'seq',
  'activatedRoutes',
]);

@Injectable()
export class MenuRepository extends BaseRepository<MenuRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('menu', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => ALLOWED_COLUMNS.has(key) && value !== undefined,
      ),
    );
  }

  /**
   * Returns all menu rows joined with page_access for a given user.
   * Mirrors: SELECT a.*, IF(b.active=1 AND b.id, b.id, null) page_access_id,
   *          CASE WHEN b.active=0 THEN 'Requested Access' END page_access_requested
   *          FROM menu a LEFT JOIN page_access b ON b.menu_id=a.id AND b.user_id=?
   *          ORDER BY seq ASC, label ASC
   */
  async menuAndByUserId(userId: number): Promise<MenuRecord[]> {
    const sql = `
      SELECT a.*,
        IF(b.active = 1 AND b.id, b.id, NULL) AS page_access_id,
        CASE WHEN b.active = 0 THEN 'Requested Access' END AS page_access_requested
      FROM menu a
      LEFT JOIN page_access b ON b.menu_id = a.id AND b.user_id = ?
      ORDER BY a.seq ASC, a.label ASC
    `;
    return this.rawQuery<MenuRecord>(sql, [userId]);
  }

  async checkUserPermission(userId: number, link: string): Promise<boolean> {
    const sql = `
      SELECT a.id FROM menu a
      INNER JOIN page_access b ON b.menu_id = a.id AND b.user_id = ? AND b.active = 1
      WHERE a.link = ?
      LIMIT 1
    `;
    const rows = await this.rawQuery<RowDataPacket>(sql, [userId, link]);
    return rows.length > 0;
  }
}

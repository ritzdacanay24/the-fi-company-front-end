import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

export interface PageAccessRecord extends RowDataPacket {
  id: number;
  user_id: number;
  active: number;
  menu_id: number | null;
  created_date: string | null;
}

@Injectable()
export class PageAccessRepository extends BaseRepository<PageAccessRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('page_access', mysqlService);
  }

  async getByUserId(userId: number): Promise<PageAccessRecord[]> {
    return this.find({ user_id: userId });
  }

  async findByUserAndMenu(userId: number, menuId: number): Promise<PageAccessRecord | null> {
    const sql = `SELECT * FROM page_access WHERE user_id = ? AND menu_id = ? LIMIT 1`;
    const rows = await this.rawQuery<PageAccessRecord>(sql, [userId, menuId]);
    return rows[0] ?? null;
  }

  async activate(id: number): Promise<void> {
    await this.rawQuery(`UPDATE page_access SET active = 1 WHERE id = ?`, [id]);
  }

  async deactivate(id: number): Promise<void> {
    await this.rawQuery(`DELETE FROM page_access WHERE id = ?`, [id]);
  }

  async requestAccess(userId: number, menuId: number): Promise<void> {
    await this.rawQuery(
      `INSERT INTO page_access (user_id, menu_id, active, created_date) VALUES (?, ?, 0, NOW())`,
      [userId, menuId],
    );
  }
}

import { Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

type GenericRow = Record<string, unknown>;

@Injectable()
export class OwnersRepository {
  constructor(private readonly mysqlService: MysqlService) {}

  async isAdmin(userId?: string | number | null): Promise<boolean> {
    if (!userId) {
      return false;
    }

    const sql = `
      SELECT COUNT(*) AS count
      FROM eyefidb.owner_admin_users
      WHERE user_id = ?
    `;
    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [userId]);
    return Number(rows[0]?.count || 0) > 0;
  }

  async getOwnerDropdownSetting(): Promise<boolean> {
    const sql = `
      SELECT setting_value
      FROM eyefidb.system_settings
      WHERE setting_key = 'owner_dropdown_enabled'
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql);
    if (!rows.length) {
      return true;
    }

    return String(rows[0].setting_value) === '1';
  }

  async setOwnerDropdownSetting(enabled: boolean, updatedBy = 'system'): Promise<void> {
    const settingValue = enabled ? '1' : '0';
    const sql = `
      INSERT INTO eyefidb.system_settings (setting_key, setting_value, updated_by, updated_at)
      VALUES ('owner_dropdown_enabled', ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        updated_by = VALUES(updated_by),
        updated_at = NOW()
    `;

    await this.mysqlService.query<RowDataPacket[]>(sql, [settingValue, updatedBy]);
  }

  async getAllOwners(activeOnly = false): Promise<GenericRow[]> {
    const sql = activeOnly
      ? `
        SELECT
          id,
          name,
          email,
          department,
          description,
          display_order,
          is_active,
          is_production,
          created_at,
          created_by,
          updated_at,
          updated_by
        FROM eyefidb.owners
        WHERE is_active = 1
        ORDER BY display_order ASC, name ASC
      `
      : `
        SELECT
          id,
          name,
          email,
          department,
          description,
          display_order,
          is_active,
          is_production,
          created_at,
          created_by,
          updated_at,
          updated_by
        FROM eyefidb.owners
        ORDER BY is_active DESC, display_order ASC, name ASC
      `;

    return this.mysqlService.query<RowDataPacket[]>(sql);
  }

  async getOwnersForUser(userId: string | number, activeOnly = true): Promise<GenericRow[]> {
    let sql = `
      SELECT DISTINCT
        o.id,
        o.name,
        o.email,
        o.department,
        o.description,
        o.display_order,
        o.is_active,
        o.is_production,
        o.created_at,
        o.created_by,
        o.updated_at,
        o.updated_by
      FROM eyefidb.owners o
      INNER JOIN eyefidb.user_owners uo ON uo.owner_id = o.id
      WHERE uo.user_id = ?
    `;

    if (activeOnly) {
      sql += ' AND o.is_active = TRUE';
    }

    sql += ' ORDER BY o.display_order ASC, o.name ASC';
    return this.mysqlService.query<RowDataPacket[]>(sql, [userId]);
  }

  async getUsersForOwner(ownerId: string | number): Promise<GenericRow[]> {
    const sql = `
      SELECT
        u.id AS user_id,
        u.username,
        CONCAT(u.first, ' ', u.last) AS full_name,
        u.email,
        uo.created_at
      FROM eyefidb.user_owners uo
      INNER JOIN db.users u ON uo.user_id = u.id
      WHERE uo.owner_id = ?
        AND u.active = 1
      ORDER BY u.first, u.last
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [ownerId]);
  }

  async getOwnerAssignmentsForUser(userId: string | number): Promise<GenericRow[]> {
    const sql = `
      SELECT
        o.id,
        o.id AS owner_id,
        o.name,
        o.email,
        o.department,
        o.description,
        o.display_order,
        uo.created_at
      FROM eyefidb.user_owners uo
      INNER JOIN eyefidb.owners o ON uo.owner_id = o.id
      WHERE uo.user_id = ?
        AND o.is_active = TRUE
      ORDER BY o.display_order, o.name
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [userId]);
  }

  async getAdminUsers(): Promise<GenericRow[]> {
    const sql = `
      SELECT
        oa.user_id,
        oa.created_at,
        oa.created_by,
        u.first,
        u.last,
        u.email
      FROM eyefidb.owner_admin_users oa
      LEFT JOIN db.users u ON u.id = oa.user_id
      ORDER BY oa.created_at DESC
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql);
  }

  async getOwnerById(id: string | number): Promise<GenericRow | null> {
    const sql = `
      SELECT
        id,
        name,
        email,
        department,
        description,
        display_order,
        is_active,
        is_production,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM eyefidb.owners
      WHERE id = ?
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [id]);
    return (rows[0] as GenericRow) || null;
  }

  async existsOwnerById(id: string | number): Promise<boolean> {
    const sql = 'SELECT id FROM eyefidb.owners WHERE id = ? LIMIT 1';
    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [id]);
    return rows.length > 0;
  }

  async existsOwnerByName(name: string): Promise<boolean> {
    const sql = 'SELECT id FROM eyefidb.owners WHERE name = ? LIMIT 1';
    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [name]);
    return rows.length > 0;
  }

  async createOwner(data: {
    name: string;
    email?: string | null;
    department?: string | null;
    description?: string | null;
    display_order: number;
    is_active: boolean;
    is_production: boolean;
    created_by: string;
  }): Promise<number> {
    const sql = `
      INSERT INTO eyefidb.owners
      (name, email, department, description, display_order, is_active, is_production, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [
      data.name,
      data.email ?? null,
      data.department ?? null,
      data.description ?? null,
      data.display_order,
      data.is_active ? 1 : 0,
      data.is_production ? 1 : 0,
      data.created_by,
    ]);

    return Number(result.insertId);
  }

  async updateOwner(
    id: string | number,
    updateFields: string[],
    updateValues: unknown[],
  ): Promise<number> {
    const sql = `UPDATE eyefidb.owners SET ${updateFields.join(', ')} WHERE id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [...updateValues, id]);
    return Number(result.affectedRows);
  }

  async softDeleteOwner(id: string | number, deletedBy: string): Promise<number> {
    const sql = `
      UPDATE eyefidb.owners
      SET is_active = FALSE, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [deletedBy, id]);
    return Number(result.affectedRows);
  }

  async reorderOwners(orders: Array<{ id: number; display_order: number }>, updatedBy: string): Promise<void> {
    await this.mysqlService.withTransaction(async (connection) => {
      const sql = `
        UPDATE eyefidb.owners
        SET display_order = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      for (const order of orders) {
        await connection.execute(sql, [order.display_order, updatedBy, order.id]);
      }
    });
  }

  async ownerAssignmentExists(userId: string | number, ownerId: string | number): Promise<boolean> {
    const sql = 'SELECT id FROM eyefidb.user_owners WHERE user_id = ? AND owner_id = ? LIMIT 1';
    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [userId, ownerId]);
    return rows.length > 0;
  }

  async assignOwnerToUser(userId: string | number, ownerId: string | number, createdBy: string): Promise<void> {
    const sql = 'INSERT INTO eyefidb.user_owners (user_id, owner_id, created_by) VALUES (?, ?, ?)';
    await this.mysqlService.execute<ResultSetHeader>(sql, [userId, ownerId, createdBy]);
  }

  async removeOwnerFromUser(userId: string | number, ownerId: string | number): Promise<number> {
    const sql = 'DELETE FROM eyefidb.user_owners WHERE user_id = ? AND owner_id = ?';
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [userId, ownerId]);
    return Number(result.affectedRows);
  }

  async adminUserExists(userId: string | number): Promise<boolean> {
    const sql = 'SELECT COUNT(*) AS count FROM eyefidb.owner_admin_users WHERE user_id = ?';
    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [userId]);
    return Number(rows[0]?.count || 0) > 0;
  }

  async addAdminUser(userId: string | number, createdBy: string): Promise<void> {
    const sql = `
      INSERT INTO eyefidb.owner_admin_users (user_id, created_by, created_at)
      VALUES (?, ?, NOW())
    `;
    await this.mysqlService.execute<ResultSetHeader>(sql, [userId, createdBy]);
  }

  async removeAdminUser(userId: string | number): Promise<number> {
    const sql = 'DELETE FROM eyefidb.owner_admin_users WHERE user_id = ?';
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [userId]);
    return Number(result.affectedRows);
  }

  /**
   * Get active owners with production status
   */
  async getActiveWithProductionStatus(): Promise<GenericRow[]> {
    const sql = `
      SELECT name, is_production
      FROM eyefidb.owners
      WHERE is_active = 1
    `;
    return this.mysqlService.query<RowDataPacket[]>(sql);
  }
}

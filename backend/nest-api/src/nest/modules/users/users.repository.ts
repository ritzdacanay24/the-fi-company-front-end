import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

export interface UserRecord extends RowDataPacket {
  id: number;
  parentId: string | null;
  first: string | null;
  last: string | null;
  workArea: string | null;
  title: string | null;
  area: string | null;
  department: string | null;
  email: string | null;
  workPhone: string | null;
  createdDate: string | null;
  active: number;
  admin: number;
  access: string | null;
  employeeType1: string | null;
  loggedIn: number;
  state: string | null;
  city: string | null;
  type: number;
  employeeType: number | null;
  lastUpdate: string | null;
  lastLoggedIn: string | null;
  image: string | null;
  fileName: string | null;
  address: string | null;
  address1: string | null;
  zipCode: number | null;
  settings: string | null;
  leadInstaller: number;
  orgChartPlaceHolder: number;
  company_id: number | null;
  created_by: number | null;
  isEmployee: number;
  enableTwostep: number;
  showImage: number;
  openPosition: number;
  hire_date: string | null;
  org_chart_department: string | null;
  org_chart_expand: number;
  org_chart_order: number;
  color: string | null;
  geo_location_consent: string | null;
  card_number: number | null;
}

const ALLOWED_COLUMNS = new Set([
  'parentId', 'first', 'last', 'workArea', 'title', 'area', 'department',
  'email', 'workPhone', 'createdDate', 'active', 'admin', 'access',
  'employeeType1', 'loggedIn', 'state', 'city', 'type', 'employeeType',
  'lastUpdate', 'lastLoggedIn', 'image', 'fileName', 'address', 'address1',
  'zipCode', 'settings', 'leadInstaller', 'orgChartPlaceHolder', 'company_id',
  'created_by', 'isEmployee', 'enableTwostep', 'showImage', 'openPosition',
  'hire_date', 'org_chart_department', 'org_chart_expand', 'color',
  'org_chart_order',
  'geo_location_consent', 'card_number',
]);

@Injectable()
export class UsersRepository extends BaseRepository<UserRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('db.users', mysqlService);
  }

  sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => ALLOWED_COLUMNS.has(key) && value !== undefined,
      ),
    );
  }

  async getList(active?: number): Promise<UserRecord[]> {
    let sql = 'SELECT * FROM db.users WHERE 1=1';
    const params: unknown[] = [];

    if (active !== undefined) {
      sql += ' AND active = ?';
      params.push(active);
    }

    sql += ' ORDER BY org_chart_order ASC, first ASC';

    return this.rawQuery<UserRecord>(sql, params);
  }

  async getById(id: number): Promise<UserRecord | null> {
    return this.findOne({ id });
  }

  async updateOrgChartPosition(
    id: number,
    payload: { parentId: number | null; beforeId: number | null; afterId: number | null },
  ): Promise<void> {
    await this.mysqlService.withTransaction(async (connection) => {
      const currentUser = await this.findUserPositionInTransaction(connection, id);
      if (!currentUser) {
        return;
      }

      const parentId = payload.parentId;
      const siblings = await this.getSiblingRowsInTransaction(connection, parentId, id);
      const siblingIds = siblings.map((row) => row.id);
      const insertIndex = this.resolveSiblingInsertIndex(siblingIds, payload.beforeId, payload.afterId);

      siblingIds.splice(insertIndex, 0, id);

      await connection.execute<ResultSetHeader>(
        'UPDATE db.users SET parentId = ? WHERE id = ?',
        [parentId, id],
      );

      for (let index = 0; index < siblingIds.length; index += 1) {
        await connection.execute<ResultSetHeader>(
          'UPDATE db.users SET org_chart_order = ? WHERE id = ?',
          [(index + 1) * 100, siblingIds[index]],
        );
      }

      if (currentUser.parentId !== parentId) {
        await this.resequenceSiblingsInTransaction(connection, currentUser.parentId, id);
      }
    });
  }

  async getUserWithTechRate(): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT
        CASE WHEN a.title = 'Vendor' THEN a.first ELSE CONCAT(a.first, ' ', a.last) END AS user,
        a.id,
        false AS checked,
        b.rate1 AS user_rate,
        a.title
      FROM db.users a
      LEFT JOIN db.user_rates b ON a.id = b.userId
      WHERE a.area = 'Field Service'
        AND (a.active = 1 OR a.title = 'Vendor')
        AND a.type = 0
      ORDER BY CASE WHEN a.title = 'Vendor' THEN a.first ELSE CONCAT(a.first, ' ', a.last) END ASC`,
    );
  }

  async getUserWithTechRateById(id: number): Promise<RowDataPacket | null> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT
        CASE WHEN a.title = 'Vendor' THEN a.first ELSE CONCAT(a.first, ' ', a.last) END AS user,
        a.id,
        false AS checked,
        b.rate1 AS user_rate,
        a.title,
        a.id AS user_id
      FROM db.users a
      LEFT JOIN db.user_rates b ON a.id = b.userId
      WHERE a.area = 'Field Service'
        AND a.active = 1
        AND a.type = 0
        AND a.id = ?
        AND (a.access = 1 OR a.title = 'Vendor')
      ORDER BY CASE WHEN a.title = 'Vendor' THEN a.first ELSE CONCAT(a.first, ' ', a.last) END ASC`,
      [id],
    );

    return rows[0] ?? null;
  }

  async search(text: string): Promise<UserRecord[]> {
    const trimmed = String(text || '').trim();
    if (!trimmed) {
      return [];
    }

    const like = `%${trimmed}%`;
    return this.rawQuery<UserRecord>(
      `SELECT *
       FROM db.users
       WHERE active = 1
         AND (
           first LIKE ?
           OR last LIKE ?
           OR CONCAT(first, ' ', last) LIKE ?
           OR email LIKE ?
         )
      ORDER BY org_chart_order ASC, first ASC
       LIMIT 100`,
      [like, like, like, like],
    );
  }

  async resetPasswordByEmail(email: string, newPassword: string): Promise<boolean> {
    const hashed = createHash('sha256').update(newPassword).digest('hex');
    const result = await this.rawQuery<RowDataPacket>(
      'UPDATE db.users SET pass = ? WHERE email = ?',
      [hashed, email],
    );
    return (result as unknown as { affectedRows: number }).affectedRows > 0;
  }

  private async findUserPositionInTransaction(connection: PoolConnection, id: number): Promise<{ id: number; parentId: number | null } | null> {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
         id,
         CAST(COALESCE(NULLIF(parentId, ''), '0') AS SIGNED) AS parentId
       FROM db.users
       WHERE id = ?
       LIMIT 1`,
      [id],
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      parentId: row.parentId === null ? null : Number(row.parentId),
    };
  }

  private async getSiblingRowsInTransaction(connection: PoolConnection, parentId: number | null, excludeId: number): Promise<Array<{ id: number }>> {
    const parentClause = parentId === null
      ? `(parentId IS NULL OR parentId = '')`
      : `CAST(COALESCE(NULLIF(parentId, ''), '0') AS SIGNED) = ?`;
    const params: unknown[] = parentId === null ? [excludeId] : [parentId, excludeId];

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id
       FROM db.users
       WHERE ${parentClause}
         AND id != ?
       ORDER BY org_chart_order ASC, first ASC, last ASC, id ASC`,
      params,
    );

    return rows.map((row) => ({ id: Number(row.id) }));
  }

  private async resequenceSiblingsInTransaction(connection: PoolConnection, parentId: number | null, excludeId: number): Promise<void> {
    const siblings = await this.getSiblingRowsInTransaction(connection, parentId, excludeId);

    for (let index = 0; index < siblings.length; index += 1) {
      await connection.execute<ResultSetHeader>(
        'UPDATE db.users SET org_chart_order = ? WHERE id = ?',
        [(index + 1) * 100, siblings[index].id],
      );
    }
  }

  private resolveSiblingInsertIndex(siblingIds: number[], beforeId: number | null, afterId: number | null): number {
    if (beforeId != null) {
      const beforeIndex = siblingIds.indexOf(beforeId);
      if (beforeIndex >= 0) {
        return beforeIndex;
      }
    }

    if (afterId != null) {
      const afterIndex = siblingIds.indexOf(afterId);
      if (afterIndex >= 0) {
        return afterIndex + 1;
      }
    }

    return siblingIds.length;
  }
}

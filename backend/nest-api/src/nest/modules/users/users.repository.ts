import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
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
  'geo_location_consent', 'card_number',
]);

@Injectable()
export class UsersRepository extends BaseRepository<UserRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    // users table lives in the `db` database, not `eyefidb`
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

    sql += ' ORDER BY first ASC';

    return this.rawQuery<UserRecord>(sql, params);
  }

  async getById(id: number): Promise<UserRecord | null> {
    return this.findOne({ id });
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
       ORDER BY first ASC
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
}

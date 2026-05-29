import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

const ORG_POSITION_ID_OFFSET = 1000000000;

interface OpenPositionRecord extends RowDataPacket {
  id: number;
  title: string;
  reports_to_user_id: number | null;
  department: string | null;
  city: string | null;
  state: string | null;
  active: number;
  status: string;
  org_chart_order: number;
  created_by: number | null;
  filled_by_user_id: number | null;
  filled_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface OpenPositionCreatePayload {
  title: string;
  reportsToUserId?: number | null;
  department?: string | null;
  city?: string | null;
  state?: string | null;
  createdBy?: number | null;
}

interface OpenPositionUpdatePayload {
  title?: string;
  reportsToUserId?: number | null;
  department?: string | null;
  city?: string | null;
  state?: string | null;
  active?: number;
  status?: 'open' | 'filled' | 'closed';
  filledByUserId?: number | null;
}

@Injectable()
export class OrgChartRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getOrgChart(filters: Record<string, string>): Promise<RowDataPacket[]> {
    const userFilters = this.extractSupportedFilters(filters, ['isEmployee', 'active', 'department', 'city', 'state']);
    const users = await this.getUsersForOrgChart(userFilters);
    const openPositions = await this.getOpenPositionsForOrgChart(userFilters);

    const merged = [...users, ...openPositions];

    merged.sort((left, right) => {
      const leftParent = this.toSortableParentId(left.parentId);
      const rightParent = this.toSortableParentId(right.parentId);
      if (leftParent !== rightParent) {
        return leftParent - rightParent;
      }

      const leftOrder = Number(left.org_chart_order) || 0;
      const rightOrder = Number(right.org_chart_order) || 0;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      const leftFirst = String(left.first || '').toLowerCase();
      const rightFirst = String(right.first || '').toLowerCase();
      if (leftFirst !== rightFirst) {
        return leftFirst.localeCompare(rightFirst);
      }

      const leftLast = String(left.last || '').toLowerCase();
      const rightLast = String(right.last || '').toLowerCase();
      if (leftLast !== rightLast) {
        return leftLast.localeCompare(rightLast);
      }

      return Number(left.id) - Number(right.id);
    });

    return merged;
  }

  async listOpenPositions(filters: Record<string, string>): Promise<OpenPositionRecord[]> {
    const safeFilters = this.extractSupportedFilters(filters, ['active', 'status', 'department', 'city', 'state']);

    let sql = `SELECT
      positions.*,
      CONCAT_WS(' ', manager.first, manager.last) AS manager_name
      FROM db.org_positions positions
      LEFT JOIN db.users manager ON manager.id = positions.reports_to_user_id`;
    const params: unknown[] = [];
    const clauses: string[] = [];

    Object.entries(safeFilters).forEach(([key, value]) => {
      clauses.push(`\`${key}\` = ?`);
      params.push(value);
    });

    if (clauses.length > 0) {
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    sql += ' ORDER BY positions.org_chart_order ASC, positions.title ASC, positions.id ASC';

    return this.mysqlService.query<OpenPositionRecord[]>(sql, params);
  }

  async createOpenPosition(payload: OpenPositionCreatePayload): Promise<OpenPositionRecord | null> {
    const title = String(payload.title || '').trim();
    if (!title) {
      throw new Error('title is required');
    }

    const reportsToUserId = this.toNullableNumber(payload.reportsToUserId);
    const orgChartOrder = await this.getNextOpenPositionOrder(reportsToUserId);

    const result = await this.mysqlService.execute<ResultSetHeader>(
      `INSERT INTO db.org_positions (
        title,
        reports_to_user_id,
        department,
        city,
        state,
        active,
        status,
        org_chart_order,
        created_by,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 'open', ?, ?, NOW(), NOW())`,
      [
        title,
        reportsToUserId,
        this.toNullableString(payload.department),
        this.toNullableString(payload.city),
        this.toNullableString(payload.state),
        orgChartOrder,
        this.toNullableNumber(payload.createdBy),
      ],
    );

    return this.getOpenPositionById(Number(result.insertId));
  }

  async updateOpenPosition(id: number, payload: OpenPositionUpdatePayload): Promise<OpenPositionRecord | null> {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (payload.title !== undefined) {
      updates.push('title = ?');
      params.push(String(payload.title || '').trim());
    }

    if (payload.reportsToUserId !== undefined) {
      updates.push('reports_to_user_id = ?');
      params.push(this.toNullableNumber(payload.reportsToUserId));
    }

    if (payload.department !== undefined) {
      updates.push('department = ?');
      params.push(this.toNullableString(payload.department));
    }

    if (payload.city !== undefined) {
      updates.push('city = ?');
      params.push(this.toNullableString(payload.city));
    }

    if (payload.state !== undefined) {
      updates.push('state = ?');
      params.push(this.toNullableString(payload.state));
    }

    if (payload.active !== undefined) {
      updates.push('active = ?');
      params.push(Number(payload.active) ? 1 : 0);
    }

    if (payload.status !== undefined) {
      updates.push('status = ?');
      params.push(payload.status);

      if (payload.status === 'filled') {
        updates.push('filled_at = NOW()');
        updates.push('closed_at = NULL');
      }

      if (payload.status === 'closed') {
        updates.push('closed_at = NOW()');
      }

      if (payload.status === 'open') {
        updates.push('filled_at = NULL');
        updates.push('closed_at = NULL');
      }
    }

    if (payload.filledByUserId !== undefined) {
      updates.push('filled_by_user_id = ?');
      params.push(this.toNullableNumber(payload.filledByUserId));
    }

    if (updates.length === 0) {
      return this.getOpenPositionById(id);
    }

    updates.push('updated_at = NOW()');

    await this.mysqlService.execute<ResultSetHeader>(
      `UPDATE db.org_positions
       SET ${updates.join(', ')}
       WHERE id = ?`,
      [...params, id],
    );

    return this.getOpenPositionById(id);
  }

  async fillOpenPosition(id: number, filledByUserId?: number | null): Promise<OpenPositionRecord | null> {
    const position = await this.getOpenPositionById(id);
    if (!position) {
      return null;
    }

    if (String(position.status) !== 'open' || Number(position.active) !== 1) {
      return this.getOpenPositionById(id);
    }

    const resolvedFilledByUserId = this.toNullableNumber(filledByUserId);

    if (resolvedFilledByUserId == null) {
      return this.updateOpenPosition(id, {
        status: 'filled',
        active: 1,
        filledByUserId: null,
      });
    }

    await this.mysqlService.withTransaction(async (connection) => {
      const positionParentId = this.toNullableNumber(position.reports_to_user_id);
      const positionDepartment = this.toNullableString(position.department);
      const positionCity = this.toNullableString(position.city);
      const positionState = this.toNullableString(position.state);
      const positionTitle = this.toNullableString(position.title);

      const currentUser = await this.findUserPositionInTransaction(connection, resolvedFilledByUserId);
      if (!currentUser) {
        throw new Error(`User with id ${resolvedFilledByUserId} not found`);
      }

      const siblings = await this.getSiblingRowsInTransaction(connection, positionParentId, resolvedFilledByUserId);
      const siblingIds = siblings.map((row) => row.id);
      siblingIds.push(resolvedFilledByUserId);

      const currentParentId = currentUser.parentId;

      await connection.execute<ResultSetHeader>(
        `UPDATE db.users
         SET parentId = ?,
             title = COALESCE(NULLIF(?, ''), title),
             department = COALESCE(NULLIF(?, ''), department),
             city = COALESCE(NULLIF(?, ''), city),
             state = COALESCE(NULLIF(?, ''), state),
             openPosition = 0
         WHERE id = ?`,
        [
          positionParentId,
          positionTitle,
          positionDepartment,
          positionCity,
          positionState,
          resolvedFilledByUserId,
        ],
      );

      for (let index = 0; index < siblingIds.length; index += 1) {
        await connection.execute<ResultSetHeader>(
          'UPDATE db.users SET org_chart_order = ? WHERE id = ?',
          [(index + 1) * 100, siblingIds[index]],
        );
      }

      if (currentParentId !== positionParentId) {
        await this.resequenceSiblingsInTransaction(connection, currentParentId, resolvedFilledByUserId);
      }

      await connection.execute<ResultSetHeader>(
        `UPDATE db.org_positions
         SET status = 'filled',
             filled_by_user_id = ?,
             filled_at = NOW(),
             closed_at = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [resolvedFilledByUserId, id],
      );
    });

    return this.getOpenPositionById(id);
  }

  private async findUserPositionInTransaction(connection: any, id: number): Promise<{ id: number; parentId: number | null } | null> {
    const [rows] = await connection.query(
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

  private async getSiblingRowsInTransaction(connection: any, parentId: number | null, excludeId: number): Promise<Array<{ id: number }>> {
    const parentClause = parentId === null
      ? `(parentId IS NULL OR parentId = '')`
      : `CAST(COALESCE(NULLIF(parentId, ''), '0') AS SIGNED) = ?`;
    const params: unknown[] = parentId === null ? [excludeId] : [parentId, excludeId];

    const [rows] = await connection.query(
      `SELECT id
       FROM db.users
       WHERE ${parentClause}
         AND id != ?
       ORDER BY org_chart_order ASC, first ASC, last ASC, id ASC`,
      params,
    );

    return rows.map((row: RowDataPacket) => ({ id: Number(row.id) }));
  }

  private async resequenceSiblingsInTransaction(connection: any, parentId: number | null, excludeId: number): Promise<void> {
    const siblings = await this.getSiblingRowsInTransaction(connection, parentId, excludeId);

    for (let index = 0; index < siblings.length; index += 1) {
      await connection.execute(
        'UPDATE db.users SET org_chart_order = ? WHERE id = ?',
        [(index + 1) * 100, siblings[index].id],
      );
    }
  }

  async hasSubordinates(id: string): Promise<RowDataPacket[]> {
    const sql = `
      SELECT id
      FROM db.users
      WHERE parentId = ?
        AND active = 1
        AND isEmployee = 1
      UNION ALL
      SELECT (${ORG_POSITION_ID_OFFSET} + id) AS id
      FROM db.org_positions
      WHERE reports_to_user_id = ?
        AND active = 1
        AND status = 'open'
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [id, id]);
  }

  private async getUsersForOrgChart(filters: Record<string, string>): Promise<RowDataPacket[]> {
    let sql = 'SELECT * FROM db.users';
    const params: unknown[] = [];
    const clauses: string[] = [];

    Object.entries(filters).forEach(([key, value]) => {
      clauses.push(`\`${key}\` = ?`);
      params.push(value);
    });

    if (clauses.length > 0) {
      sql += ` WHERE ${clauses.join(' AND ')}`;
    }

    sql += ` ORDER BY
      CASE WHEN parentId IS NULL OR parentId = '' THEN 0 ELSE 1 END,
      CAST(COALESCE(NULLIF(parentId, ''), '0') AS UNSIGNED),
      org_chart_order ASC,
      first ASC,
      last ASC,
      id ASC`;

    return this.mysqlService.query<RowDataPacket[]>(sql, params);
  }

  private async getOpenPositionsForOrgChart(filters: Record<string, string>): Promise<RowDataPacket[]> {
    const clauses = ["active = 1", "status = 'open'"];
    const params: unknown[] = [];

    if (filters.active !== undefined) {
      clauses.push('active = ?');
      params.push(Number(filters.active) ? 1 : 0);
    }

    if (filters.department !== undefined) {
      clauses.push('department = ?');
      params.push(filters.department);
    }

    if (filters.city !== undefined) {
      clauses.push('city = ?');
      params.push(filters.city);
    }

    if (filters.state !== undefined) {
      clauses.push('state = ?');
      params.push(filters.state);
    }

    const rows = await this.mysqlService.query<OpenPositionRecord[]>(
      `SELECT *
       FROM db.org_positions
       WHERE ${clauses.join(' AND ')}
       ORDER BY org_chart_order ASC, title ASC, id ASC`,
      params,
    );

    return rows.map((row) => {
      const id = ORG_POSITION_ID_OFFSET + Number(row.id);
      const title = String(row.title || '').trim();
      const city = this.toNullableString(row.city) || '';
      const state = this.toNullableString(row.state) || '';

      return {
        id,
        openPositionId: Number(row.id),
        parentId: row.reports_to_user_id == null ? null : Number(row.reports_to_user_id),
        first: title,
        last: '',
        title,
        area: null,
        department: this.toNullableString(row.department),
        email: `open.position.${row.id}@placeholder.local`,
        active: Number(row.active) ? 1 : 0,
        admin: 0,
        access: '1',
        employeeType1: 'FT',
        loggedIn: 0,
        state,
        city,
        type: 0,
        employeeType: 0,
        image: null,
        fileName: null,
        orgChartPlaceHolder: 0,
        isEmployee: 1,
        showImage: 1,
        openPosition: 1,
        hire_date: null,
        org_chart_department: this.toNullableString(row.department),
        org_chart_expand: 0,
        org_chart_order: Number(row.org_chart_order) || 0,
        color: null,
        createdDate: row.created_at,
        lastUpdate: row.updated_at,
        workPhone: null,
      } as RowDataPacket;
    });
  }

  private async getOpenPositionById(id: number): Promise<OpenPositionRecord | null> {
    const rows = await this.mysqlService.query<OpenPositionRecord[]>(
      `SELECT *
       FROM db.org_positions
       WHERE id = ?
       LIMIT 1`,
      [id],
    );

    return rows[0] ?? null;
  }

  private async getNextOpenPositionOrder(reportsToUserId: number | null): Promise<number> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COALESCE(MAX(org_chart_order), 0) + 100 AS nextOrder
       FROM db.org_positions
       WHERE active = 1
         AND status = 'open'
         AND ((reports_to_user_id IS NULL AND ? IS NULL) OR reports_to_user_id = ?)`,
      [reportsToUserId, reportsToUserId],
    );

    return Number(rows[0]?.nextOrder) || 100;
  }

  private toSortableParentId(value: unknown): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private extractSupportedFilters(filters: Record<string, string>, allowList: string[]): Record<string, string> {
    const allowed = new Set(allowList);
    const next: Record<string, string> = {};

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (!allowed.has(key) || !this.isSafeColumnName(key) || value == null || value === '') {
        return;
      }
      next[key] = String(value);
    });

    return next;
  }

  private toNullableString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }

  private isSafeColumnName(column: string): boolean {
    return /^[a-zA-Z0-9_]+$/.test(column);
  }
}

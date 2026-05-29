import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface DepartmentRow extends RowDataPacket {
  id: number;
  department_name: string;
  user_count: number;
  display_order: number;
  is_active: number;
  department_head_user_id: number | null;
  department_head_name: string | null;
}

interface DepartmentPlaceholderRow extends RowDataPacket {
  id: number;
  department: string | null;
}

interface DepartmentReferenceRow extends RowDataPacket {
  placeholder_id: number | null;
  department_record_id: number | null;
  department_name: string;
}

interface AvailableUserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string | null;
  department: string | null;
  title: string | null;
}

@Injectable()
export class DepartmentsRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getDepartments(includeInactive = false): Promise<DepartmentRow[]> {
    return this.mysqlService.query<DepartmentRow[]>(
      `
        SELECT
          d.id,
          d.department_name,
          d.display_order,
          d.is_active,
          d.department_head_user_id,
          NULLIF(TRIM(CONCAT_WS(' ', head.first, head.last)), '') AS department_head_name,
          COALESCE(uc.user_count, 0) AS user_count
        FROM db.departments d
        LEFT JOIN db.users head
          ON head.id = d.department_head_user_id
        LEFT JOIN (
          SELECT
            TRIM(COALESCE(u.department, '')) AS department_name,
            COUNT(*) AS user_count
          FROM db.users u
          WHERE TRIM(COALESCE(u.department, '')) != ''
            AND u.active = 1
            AND u.type != 3
            AND (u.orgChartPlaceHolder IS NULL OR u.orgChartPlaceHolder != 1)
          GROUP BY TRIM(COALESCE(u.department, ''))
        ) uc
          ON LOWER(uc.department_name) = LOWER(TRIM(COALESCE(d.department_name, '')))
        ${includeInactive ? '' : 'WHERE d.is_active = 1'}
        ORDER BY d.department_name ASC
      `,
    );
  }

  async resolveDepartmentReference(id: number): Promise<DepartmentReferenceRow | null> {
    const rows = await this.mysqlService.query<DepartmentReferenceRow[]>(
      `
        SELECT
          p.id AS placeholder_id,
          d.id AS department_record_id,
          d.department_name AS department_name
        FROM db.departments d
        LEFT JOIN db.users p
          ON p.type = 3
         AND p.orgChartPlaceHolder = 1
         AND (
           p.department = d.department_name
           OR p.first = d.department_name
         )
        WHERE d.id = ?
        LIMIT 1
      `,
      [id],
    );

    return rows[0] ?? null;
  }

  async createDepartmentPlaceholder(departmentName: string): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `
        INSERT INTO db.users
          (first, last, title, department, org_chart_department, active, type, orgChartPlaceHolder, openPosition)
        VALUES
          (?, '', 'Department', ?, ?, 1, 3, 1, 1)
      `,
      [departmentName, departmentName, departmentName],
    );

    return Number(result.insertId);
  }

  async upsertDepartmentRecord(
    departmentName: string,
    options: { previousDepartmentName?: string | null; departmentHeadUserId?: number | null; displayOrder?: number | null } = {},
  ): Promise<void> {
    const previousDepartmentName = String(options.previousDepartmentName || '').trim();
    const departmentHeadUserId = options.departmentHeadUserId && options.departmentHeadUserId > 0 ? options.departmentHeadUserId : null;
    const displayOrder = Number.isFinite(options.displayOrder) ? Number(options.displayOrder) : 0;

    const rows = await this.mysqlService.query<Array<RowDataPacket & { id: number }>>(
      `
        SELECT id
        FROM departments
        WHERE department_name = ? OR (? != '' AND department_name = ?)
        ORDER BY department_name = ? DESC
        LIMIT 1
      `,
      [departmentName, previousDepartmentName, previousDepartmentName, departmentName],
    );

    const existingId = Number(rows[0]?.id || 0);

    if (existingId > 0) {
      await this.mysqlService.execute<ResultSetHeader>(
        `
          UPDATE departments
          SET department_name = ?,
              department_head_user_id = ?,
              display_order = ?,
              is_active = 1
          WHERE id = ?
        `,
        [departmentName, departmentHeadUserId, displayOrder, existingId],
      );
      return;
    }

    await this.mysqlService.execute<ResultSetHeader>(
      `
        INSERT INTO departments (department_name, department_head_user_id, display_order, is_active)
        VALUES (?, ?, ?, 1)
      `,
      [departmentName, departmentHeadUserId, displayOrder],
    );
  }

  async updateDepartmentPlaceholder(id: number, departmentName: string): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `
        UPDATE db.users
        SET first = ?, department = ?, org_chart_department = NULL
        WHERE id = ? AND type = 3 AND orgChartPlaceHolder = 1
      `,
      [departmentName, departmentName, id],
    );

    return Number(result.affectedRows || 0);
  }

  async findDepartmentPlaceholderById(id: number): Promise<DepartmentPlaceholderRow | null> {
    const rows = await this.mysqlService.query<DepartmentPlaceholderRow[]>(
      `
        SELECT id, department
        FROM db.users
        WHERE id = ? AND type = 3 AND orgChartPlaceHolder = 1
      `,
      [id],
    );

    return rows[0] ?? null;
  }

  async countUsersInDepartment(departmentName: string): Promise<number> {
    const rows = await this.mysqlService.query<Array<RowDataPacket & { count: number }>>(
      `
        SELECT COUNT(*) AS count
        FROM db.users
        WHERE department = ?
          AND active = 1
          AND type != 3
          AND (orgChartPlaceHolder IS NULL OR orgChartPlaceHolder != 1)
      `,
      [departmentName],
    );

    return Number(rows[0]?.count || 0);
  }

  async deleteDepartmentPlaceholder(id: number): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      'DELETE FROM db.users WHERE id = ? AND type = 3 AND orgChartPlaceHolder = 1',
      [id],
    );

    return Number(result.affectedRows || 0);
  }

  async deactivateDepartmentRecord(departmentName: string): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      'UPDATE departments SET is_active = 0 WHERE department_name = ?',
      [departmentName],
    );

    return Number(result.affectedRows || 0);
  }

  async setDepartmentRecordActiveById(id: number, isActive: boolean): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      'UPDATE db.departments SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id],
    );

    return Number(result.affectedRows || 0);
  }

  async setDepartmentPlaceholderActiveById(id: number, isActive: boolean): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      'UPDATE db.users SET active = ? WHERE id = ? AND type = 3 AND orgChartPlaceHolder = 1',
      [isActive ? 1 : 0, id],
    );

    return Number(result.affectedRows || 0);
  }

  async findActiveUserById(userId: number): Promise<boolean> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT id FROM db.users WHERE id = ? AND active = 1 LIMIT 1',
      [userId],
    );

    return rows.length > 0;
  }

  async assignUserToDepartment(userId: number, departmentName: string): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      'UPDATE db.users SET department = ?, org_chart_department = NULL WHERE id = ?',
      [departmentName, userId],
    );

    return Number(result.affectedRows || 0);
  }

  async removeUserFromDepartment(userId: number): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      'UPDATE db.users SET department = NULL, org_chart_department = NULL WHERE id = ?',
      [userId],
    );

    return Number(result.affectedRows || 0);
  }

  async getAvailableUsers(): Promise<AvailableUserRow[]> {
    return this.mysqlService.query<AvailableUserRow[]>(
      `
        SELECT
          u.id,
          COALESCE(CONCAT(TRIM(u.first), ' ', TRIM(u.last)), TRIM(u.first), CONCAT('User ', u.id)) AS name,
          u.email,
          u.department,
          u.title
        FROM db.users u
        WHERE u.active = 1
          AND u.type != 3
          AND (u.orgChartPlaceHolder IS NULL OR u.orgChartPlaceHolder != 1)
        ORDER BY u.first, u.last
        LIMIT 100
      `,
    );
  }
}

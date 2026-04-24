import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface DepartmentRow extends RowDataPacket {
  id: number;
  department_name: string;
  user_count: number;
  display_order: number;
  is_active: number;
}

interface DepartmentPlaceholderRow extends RowDataPacket {
  org_chart_department: string | null;
  department: string | null;
}

interface AvailableUserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string | null;
  department: string | null;
  org_chart_department: string | null;
  title: string | null;
}

@Injectable()
export class DepartmentsRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getDepartments(includeInactive = false): Promise<DepartmentRow[]> {
    const activeClause = includeInactive ? '' : 'AND u.active = 1';

    return this.mysqlService.query<DepartmentRow[]>(
      `
        SELECT
          MIN(u.id) AS id,
          dept_name AS department_name,
          COUNT(*) AS user_count,
          0 AS display_order,
          1 AS is_active
        FROM (
          SELECT
            u.id,
            COALESCE(NULLIF(u.org_chart_department, ''), NULLIF(u.department, ''), 'Unassigned') AS dept_name
          FROM db.users u
          WHERE (u.org_chart_department IS NOT NULL OR u.department IS NOT NULL)
            ${activeClause}
        ) u
        GROUP BY dept_name
        ORDER BY department_name ASC
      `,
    );
  }

  async createDepartment(departmentName: string): Promise<number> {
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

  async updateDepartmentPlaceholder(id: number, departmentName: string): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `
        UPDATE db.users
        SET first = ?, department = ?, org_chart_department = ?
        WHERE id = ? AND type = 3 AND orgChartPlaceHolder = 1
      `,
      [departmentName, departmentName, departmentName, id],
    );

    return Number(result.affectedRows || 0);
  }

  async findDepartmentPlaceholderById(id: number): Promise<DepartmentPlaceholderRow | null> {
    const rows = await this.mysqlService.query<DepartmentPlaceholderRow[]>(
      `
        SELECT org_chart_department, department
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
        WHERE (department = ? OR org_chart_department = ?)
          AND active = 1
          AND type != 3
          AND (orgChartPlaceHolder IS NULL OR orgChartPlaceHolder != 1)
      `,
      [departmentName, departmentName],
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

  async findActiveUserById(userId: number): Promise<boolean> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      'SELECT id FROM db.users WHERE id = ? AND active = 1 LIMIT 1',
      [userId],
    );

    return rows.length > 0;
  }

  async assignUserToDepartment(userId: number, departmentName: string): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      'UPDATE db.users SET department = ?, org_chart_department = ? WHERE id = ?',
      [departmentName, departmentName, userId],
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
          u.org_chart_department,
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

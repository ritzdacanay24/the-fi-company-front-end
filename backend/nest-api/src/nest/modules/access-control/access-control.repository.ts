import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface RoleRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  is_active: number;
}

interface PermissionRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  is_active: number;
}

interface DomainRow extends RowDataPacket {
  domain: string;
}

interface ScopeRow extends RowDataPacket {
  scope_value: string;
}

interface ModuleRow extends RowDataPacket {
  id: number;
  module_key: string;
  display_name: string;
  domain: string;
  department: string | null;
  description: string | null;
  is_active: number;
}

interface UserSummaryRow extends RowDataPacket {
  id: number;
  name: string;
  email: string | null;
  employeeType: number | null;
  active: number | null;
}

interface UserGrantRow extends RowDataPacket {
  id: number;
  permission_id: number;
  permission_name: string;
  domain: string;
  expires_at: string | null;
}

@Injectable()
export class AccessControlRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getRoles(): Promise<RoleRow[]> {
    return this.mysqlService.query<RoleRow[]>(
      `SELECT id, name, description, is_active FROM eyefidb.app_roles WHERE is_active = 1 ORDER BY name ASC`,
    );
  }

  async createRole(name: string, description?: string | null): Promise<number> {
    const result = await this.mysqlService.query<any>(
      `
        INSERT INTO eyefidb.app_roles (name, description, is_active)
        VALUES (?, ?, 1)
      `,
      [name, description ?? null],
    );

    return Number(result?.insertId || 0);
  }

  async updateRole(
    roleId: number,
    payload: { name?: string; description?: string | null; isActive?: boolean },
  ): Promise<void> {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (payload.name !== undefined) {
      updates.push('name = ?');
      params.push(payload.name);
    }

    if (payload.description !== undefined) {
      updates.push('description = ?');
      params.push(payload.description);
    }

    if (payload.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(payload.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return;
    }

    params.push(roleId);

    await this.mysqlService.query(
      `
        UPDATE eyefidb.app_roles
        SET ${updates.join(', ')}
        WHERE id = ?
      `,
      params,
    );
  }

  async getPermissions(): Promise<PermissionRow[]> {
    return this.mysqlService.query<PermissionRow[]>(
      `SELECT id, name, description, is_active FROM eyefidb.app_permissions WHERE is_active = 1 ORDER BY name ASC`,
    );
  }

  async getDomains(): Promise<string[]> {
    const rows = await this.mysqlService.query<DomainRow[]>(
      `
        SELECT DISTINCT domain
        FROM eyefidb.app_modules
        WHERE is_active = 1
        ORDER BY domain ASC
      `,
    );

    return rows.map((row) => row.domain).filter(Boolean);
  }

  async getModules(): Promise<ModuleRow[]> {
    return this.mysqlService.query<ModuleRow[]>(
      `
        SELECT id, module_key, display_name, domain, department, description, is_active
        FROM eyefidb.app_modules
        ORDER BY domain ASC, display_name ASC
      `,
    );
  }

  async updateModule(
    id: number,
    payload: { domain?: string; department?: string | null; isActive?: boolean },
  ): Promise<void> {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (typeof payload.domain === 'string') {
      updates.push('domain = ?');
      params.push(payload.domain);
    }

    if (payload.department !== undefined) {
      updates.push('department = ?');
      params.push(payload.department);
    }

    if (typeof payload.isActive === 'boolean') {
      updates.push('is_active = ?');
      params.push(payload.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return;
    }

    params.push(id);

    await this.mysqlService.query(
      `
        UPDATE eyefidb.app_modules
        SET ${updates.join(', ')}
        WHERE id = ?
      `,
      params,
    );
  }

  async getUsers(): Promise<UserSummaryRow[]> {
    return this.mysqlService.query<UserSummaryRow[]>(
      `
        SELECT
          id,
          TRIM(
            CASE
              WHEN COALESCE(first, '') = '' AND COALESCE(last, '') = '' THEN CONCAT('User #', id)
              WHEN COALESCE(last, '') = '' THEN COALESCE(first, '')
              WHEN COALESCE(first, '') = '' THEN COALESCE(last, '')
              ELSE CONCAT(first, ' ', last)
            END
          ) AS name,
          email,
          employeeType,
          active
        FROM db.users
        WHERE COALESCE(active, 1) = 1
        ORDER BY first ASC, last ASC
      `,
    );
  }

  async getUserRoles(userId: number): Promise<RoleRow[]> {
    return this.mysqlService.query<RoleRow[]>(
      `
        SELECT r.id, r.name, r.description, r.is_active
        FROM eyefidb.app_user_roles ur
        INNER JOIN eyefidb.app_roles r ON r.id = ur.role_id
        WHERE ur.user_id = ? AND r.is_active = 1
        ORDER BY r.name ASC
      `,
      [userId],
    );
  }

  async getUserPermissions(userId: number): Promise<PermissionRow[]> {
    return this.mysqlService.query<PermissionRow[]>(
      `
        SELECT DISTINCT p.id, p.name, p.description, p.is_active
        FROM eyefidb.app_user_roles ur
        INNER JOIN eyefidb.app_role_permissions rp ON rp.role_id = ur.role_id
        INNER JOIN eyefidb.app_permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = ? AND p.is_active = 1
        ORDER BY p.name ASC
      `,
      [userId],
    );
  }

  async getRolePermissions(roleId: number): Promise<PermissionRow[]> {
    return this.mysqlService.query<PermissionRow[]>(
      `
        SELECT p.id, p.name, p.description, p.is_active
        FROM eyefidb.app_role_permissions rp
        INNER JOIN eyefidb.app_permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = ? AND p.is_active = 1
        ORDER BY p.name ASC
      `,
      [roleId],
    );
  }

  async getUserRoleScopes(userId: number): Promise<string[]> {
    const rows = await this.mysqlService.query<ScopeRow[]>(
      `
        SELECT DISTINCT s.scope_value
        FROM eyefidb.app_user_roles ur
        INNER JOIN eyefidb.app_user_role_scopes s ON s.user_role_id = ur.id
        WHERE ur.user_id = ?
          AND s.scope_type = 'domain'
        ORDER BY s.scope_value ASC
      `,
      [userId],
    );

    return rows.map((row) => row.scope_value).filter(Boolean);
  }

  async replaceUserRoles(userId: number, roleIds: number[]): Promise<void> {
    await this.mysqlService.withTransaction(async (connection) => {
      await connection.execute(`DELETE FROM eyefidb.app_user_roles WHERE user_id = ?`, [userId]);

      if (roleIds.length === 0) {
        return;
      }

      for (const roleId of roleIds) {
        await connection.execute(
          `INSERT INTO eyefidb.app_user_roles (user_id, role_id) VALUES (?, ?)`,
          [userId, roleId],
        );
      }
    });
  }

  async replaceRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    await this.mysqlService.withTransaction(async (connection) => {
      await connection.execute(`DELETE FROM eyefidb.app_role_permissions WHERE role_id = ?`, [roleId]);

      if (permissionIds.length === 0) {
        return;
      }

      for (const permissionId of permissionIds) {
        await connection.execute(
          `INSERT INTO eyefidb.app_role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [roleId, permissionId],
        );
      }
    });
  }

  async replaceUserRoleScopes(userId: number, scopeValues: string[]): Promise<void> {
    await this.mysqlService.withTransaction(async (connection) => {
      const normalizedScopes = Array.from(
        new Set(
          scopeValues
            .map((value) => String(value || '').trim())
            .filter((value) => value.length > 0),
        ),
      );

      const [roleRows] = await connection.query<Array<RowDataPacket & { id: number }>>(
        `SELECT id FROM eyefidb.app_user_roles WHERE user_id = ?`,
        [userId],
      );

      const userRoleIds = roleRows.map((row) => Number(row.id)).filter((value) => value > 0);
      if (userRoleIds.length === 0) {
        return;
      }

      const placeholders = userRoleIds.map(() => '?').join(', ');
      await connection.execute(
        `
          DELETE FROM eyefidb.app_user_role_scopes
          WHERE scope_type = 'domain'
            AND user_role_id IN (${placeholders})
        `,
        userRoleIds,
      );

      if (normalizedScopes.length === 0) {
        return;
      }

      for (const userRoleId of userRoleIds) {
        for (const scopeValue of normalizedScopes) {
          await connection.execute(
            `
              INSERT INTO eyefidb.app_user_role_scopes (user_role_id, scope_type, scope_value)
              VALUES (?, 'domain', ?)
            `,
            [userRoleId, scopeValue],
          );
        }
      }
    });
  }

  async getUserPermissionGrants(userId: number, domain?: string): Promise<UserGrantRow[]> {
    const params: unknown[] = [userId];
    const domainClause = domain ? ' AND g.domain = ?' : '';
    if (domain) {
      params.push(domain);
    }

    return this.mysqlService.query<UserGrantRow[]>(
      `
        SELECT g.id, g.permission_id, p.name AS permission_name, g.domain, g.expires_at
        FROM eyefidb.app_user_permission_grants g
        INNER JOIN eyefidb.app_permissions p ON p.id = g.permission_id
        WHERE g.user_id = ?
          AND g.is_active = 1
          AND g.revoked_at IS NULL
          AND (g.expires_at IS NULL OR g.expires_at > NOW())
          ${domainClause}
        ORDER BY p.name ASC
      `,
      params,
    );
  }

  async replaceUserDomainPermissionGrants(
    userId: number,
    domain: string,
    permissionIds: number[],
    grantedByUserId: number,
  ): Promise<void> {
    await this.mysqlService.withTransaction(async (connection) => {
      await connection.execute(
        `
          DELETE FROM eyefidb.app_user_permission_grants
          WHERE user_id = ?
            AND domain = ?
            AND is_active = 1
            AND revoked_at IS NULL
        `,
        [userId, domain],
      );

      if (permissionIds.length === 0) {
        return;
      }

      for (const permissionId of permissionIds) {
        await connection.execute(
          `
            INSERT INTO eyefidb.app_user_permission_grants
              (user_id, permission_id, domain, granted_by, is_active)
            VALUES (?, ?, ?, ?, 1)
          `,
          [userId, permissionId, domain, grantedByUserId],
        );
      }
    });
  }

  async userHasRole(userId: number, roleNames: string[]): Promise<boolean> {
    if (roleNames.length === 0) {
      return true;
    }

    const placeholders = roleNames.map(() => '?').join(', ');
    const rows = await this.mysqlService.query<Array<RowDataPacket & { count: number }>>(
      `
        SELECT COUNT(*) AS count
        FROM eyefidb.app_user_roles ur
        INNER JOIN eyefidb.app_roles r ON r.id = ur.role_id
        WHERE ur.user_id = ?
          AND r.name IN (${placeholders})
          AND r.is_active = 1
      `,
      [userId, ...roleNames],
    );

    return Number(rows[0]?.count || 0) > 0;
  }

  async userHasPermissions(userId: number, permissionNames: string[]): Promise<boolean> {
    if (permissionNames.length === 0) {
      return true;
    }

    const placeholders = permissionNames.map(() => '?').join(', ');
    const rows = await this.mysqlService.query<Array<RowDataPacket & { count: number }>>(
      `
        SELECT COUNT(DISTINCT p.name) AS count
        FROM eyefidb.app_user_roles ur
        INNER JOIN eyefidb.app_role_permissions rp ON rp.role_id = ur.role_id
        INNER JOIN eyefidb.app_permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = ?
          AND p.name IN (${placeholders})
          AND p.is_active = 1
      `,
      [userId, ...permissionNames],
    );

    return Number(rows[0]?.count || 0) === permissionNames.length;
  }

  /**
   * Domain-scoped permission check.
   * Returns true if the user has the given action (e.g. 'write') AND
   * their role scope covers the requested domain (scope_value = domain OR scope_value = '*').
   *
   * Falls back to an active temporary grant if no role-scope match is found.
   */
  async userHasPermissionForDomain(
    userId: number,
    permissionName: string,
    domain: string,
  ): Promise<boolean> {
    // 1) Check active temporary grant (from approved permission request)
    const grantRows = await this.mysqlService.query<Array<RowDataPacket & { count: number }>>(
      `
        SELECT COUNT(*) AS count
        FROM eyefidb.app_user_permission_grants g
        INNER JOIN eyefidb.app_permissions p ON p.id = g.permission_id
        WHERE g.user_id = ?
          AND p.name = ?
          AND (g.domain = ? OR g.domain = '*')
          AND g.is_active = 1
          AND (g.expires_at IS NULL OR g.expires_at > NOW())
          AND g.revoked_at IS NULL
      `,
      [userId, permissionName, domain],
    );

    if (Number(grantRows[0]?.count || 0) > 0) {
      return true;
    }

    // 2) Check role permission + domain scope (scope_value = domain or '*')
    const roleRows = await this.mysqlService.query<Array<RowDataPacket & { count: number }>>(
      `
        SELECT COUNT(*) AS count
        FROM eyefidb.app_user_roles ur
        INNER JOIN eyefidb.app_role_permissions rp ON rp.role_id = ur.role_id
        INNER JOIN eyefidb.app_permissions p ON p.id = rp.permission_id
        INNER JOIN eyefidb.app_user_role_scopes s ON s.user_role_id = ur.id
        WHERE ur.user_id = ?
          AND p.name = ?
          AND p.is_active = 1
          AND s.scope_type = 'domain'
          AND (s.scope_value = ? OR s.scope_value = '*')
      `,
      [userId, permissionName, domain],
    );

    return Number(roleRows[0]?.count || 0) > 0;
  }

  /** Look up which domain a module key belongs to via the module registry. */
  async getModuleDomain(moduleKey: string): Promise<string | null> {
    const rows = await this.mysqlService.query<Array<RowDataPacket & { domain: string }>>(
      `SELECT domain FROM eyefidb.app_modules WHERE module_key = ? LIMIT 1`,
      [moduleKey],
    );
    return rows[0]?.domain ?? null;
  }

  /** Returns all active temporary grants for a user (optionally filtered by domain). */
  async getUserActiveGrants(
    userId: number,
    domain?: string,
  ): Promise<Array<RowDataPacket & { permission_name: string; domain: string; expires_at: string | null }>> {
    const params: unknown[] = [userId];
    const domainClause = domain ? `AND (g.domain = ? OR g.domain = '*')` : '';
    if (domain) {
      params.push(domain);
    }

    return this.mysqlService.query(
      `
        SELECT p.name AS permission_name, g.domain, g.expires_at
        FROM eyefidb.app_user_permission_grants g
        INNER JOIN eyefidb.app_permissions p ON p.id = g.permission_id
        WHERE g.user_id = ?
          ${domainClause}
          AND g.is_active = 1
          AND (g.expires_at IS NULL OR g.expires_at > NOW())
          AND g.revoked_at IS NULL
        ORDER BY p.name, g.domain
      `,
      params,
    );
  }

  async createPermissionRequest(
    userId: number,
    permissionId: number,
    domain?: string | null,
    reason?: string | null,
  ): Promise<number> {
    const domainVal = String(domain || '').trim() || '*';
    const reasonVal = String(reason || '').trim();
    const result = await this.mysqlService.query<any>(
      `
        INSERT INTO eyefidb.app_permission_requests (user_id, permission_id, domain, reason, status)
        VALUES (?, ?, ?, ?, 'pending')
      `,
      [userId, permissionId, domainVal, reasonVal],
    );
    return Number(result?.insertId || 0);
  }

  async getPermissionRequests(status?: string): Promise<RowDataPacket[]> {
    const params: unknown[] = [];
    const whereClause = status ? `WHERE r.status = ?` : `WHERE r.status IN ('pending','approved','denied','revoked','expired')`;
    if (status) params.push(status);

    return this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          r.id,
          r.user_id,
          TRIM(
            CASE
              WHEN COALESCE(u.first, '') = '' AND COALESCE(u.last, '') = '' THEN CONCAT('User #', u.id)
              WHEN COALESCE(u.last, '') = '' THEN COALESCE(u.first, '')
              WHEN COALESCE(u.first, '') = '' THEN COALESCE(u.last, '')
              ELSE CONCAT(u.first, ' ', u.last)
            END
          ) AS requester_name,
          u.email AS requester_email,
          r.permission_id,
          p.name AS permission_name,
          r.domain,
          r.reason,
          r.reference,
          r.status,
          r.requested_at,
          r.reviewed_by,
          TRIM(
            CASE
              WHEN COALESCE(rv.first, '') = '' AND COALESCE(rv.last, '') = '' THEN NULL
              WHEN COALESCE(rv.last, '') = '' THEN COALESCE(rv.first, '')
              WHEN COALESCE(rv.first, '') = '' THEN COALESCE(rv.last, '')
              ELSE CONCAT(rv.first, ' ', rv.last)
            END
          ) AS reviewer_name,
          r.reviewed_at,
          r.review_notes,
          r.expires_at
        FROM eyefidb.app_permission_requests r
        INNER JOIN db.users u ON u.id = r.user_id
        INNER JOIN eyefidb.app_permissions p ON p.id = r.permission_id
        LEFT JOIN db.users rv ON rv.id = r.reviewed_by
        ${whereClause}
        ORDER BY r.requested_at DESC
      `,
      params,
    );
  }

  async approvePermissionRequest(
    requestId: number,
    reviewerId: number,
    expiresAt?: string | null,
  ): Promise<void> {
    const requestRows = await this.mysqlService.query<Array<RowDataPacket & { user_id: number; permission_id: number; domain: string; status: string }>>(
      `SELECT user_id, permission_id, domain, status FROM eyefidb.app_permission_requests WHERE id = ? LIMIT 1`,
      [requestId],
    );

    const req = requestRows[0];
    if (!req) throw new Error('Permission request not found');
    if (req.status !== 'pending') throw new Error('Request is not pending');

    // Normalize domain — old rows may have stored '' due to MySQL non-strict NULL handling
    const grantDomain = String(req.domain || '').trim() || '*';

    await this.mysqlService.withTransaction(async (connection) => {
      await connection.execute(
        `UPDATE eyefidb.app_permission_requests
          SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), expires_at = ?
          WHERE id = ?`,
        [reviewerId, expiresAt ?? null, requestId],
      );

      // Insert the grant — guard reads this table on every protected request
      await connection.execute(
        `INSERT INTO eyefidb.app_user_permission_grants
            (user_id, permission_id, domain, request_id, granted_by, expires_at, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [req.user_id, req.permission_id, grantDomain, requestId, reviewerId, expiresAt ?? null],
      );
    });
  }

  async denyPermissionRequest(
    requestId: number,
    reviewerId: number,
    reviewNotes?: string | null,
  ): Promise<void> {
    const result = await this.mysqlService.query<any>(
      `
        UPDATE eyefidb.app_permission_requests
        SET status = 'denied', reviewed_by = ?, reviewed_at = NOW(), review_notes = ?
        WHERE id = ? AND status = 'pending'
      `,
      [reviewerId, reviewNotes ?? null, requestId],
    );

    if (Number(result?.affectedRows || 0) === 0) {
      throw new Error('Request not found or not pending');
    }
  }

  async updatePermissionRequest(
    requestId: number,
    payload: { permissionId?: number; domain?: string; reason?: string | null; reference?: string | null },
  ): Promise<void> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (payload.permissionId !== undefined) {
      fields.push('permission_id = ?');
      params.push(payload.permissionId);
    }

    if (payload.domain !== undefined) {
      fields.push('domain = ?');
      params.push(payload.domain);
    }

    if (payload.reason !== undefined) {
      fields.push('reason = ?');
      params.push(payload.reason ?? null);
    }

    if (payload.reference !== undefined) {
      fields.push('reference = ?');
      params.push(payload.reference ?? null);
    }

    if (fields.length === 0) {
      throw new Error('No fields provided for update');
    }

    const result = await this.mysqlService.query<any>(
      `
        UPDATE eyefidb.app_permission_requests
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = ? AND status = 'pending'
      `,
      [...params, requestId],
    );

    if (Number(result?.affectedRows || 0) === 0) {
      throw new Error('Permission request not found or not pending');
    }
  }

  async deletePermissionRequest(requestId: number, reviewerId?: number | null): Promise<void> {
    const requestRows = await this.mysqlService.query<Array<RowDataPacket & { user_id: number; permission_id: number; domain: string; status: string }>>(
      `SELECT user_id, permission_id, domain, status FROM eyefidb.app_permission_requests WHERE id = ? LIMIT 1`,
      [requestId],
    );

    const req = requestRows[0];
    if (!req) {
      throw new Error('Permission request not found');
    }

    await this.mysqlService.withTransaction(async (connection) => {
      // Revoke active grants tied to this request first.
      await connection.execute(
        `
          UPDATE eyefidb.app_user_permission_grants
          SET is_active = 0,
              revoked_at = NOW(),
              revoked_by = ?,
              updated_at = NOW()
          WHERE request_id = ?
            AND is_active = 1
            AND revoked_at IS NULL
        `,
        [reviewerId ?? null, requestId],
      );

      await connection.execute(
        `DELETE FROM eyefidb.app_permission_requests WHERE id = ?`,
        [requestId],
      );
    });
  }
}

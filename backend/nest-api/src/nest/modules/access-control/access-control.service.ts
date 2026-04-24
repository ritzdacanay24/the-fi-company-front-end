import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessControlRepository } from './access-control.repository';

@Injectable()
export class AccessControlService {
  constructor(private readonly repository: AccessControlRepository) {}

  async getRoles() {
    return this.repository.getRoles();
  }

  async createRole(payload: { name?: string; description?: string | null }) {
    const name = String(payload?.name || '').trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const descriptionValue = String(payload?.description || '').trim();
    const description = descriptionValue.length > 0 ? descriptionValue : null;

    const roleId = await this.repository.createRole(name, description);

    return {
      success: true,
      id: roleId,
      name,
      description,
    };
  }

  async updateRole(
    roleId: number,
    payload: { name?: string; description?: string | null; isActive?: boolean },
  ) {
    const normalizedPayload: { name?: string; description?: string | null; isActive?: boolean } = {};

    if (payload.name !== undefined) {
      const normalizedName = String(payload.name || '').trim();
      if (!normalizedName) {
        throw new BadRequestException('name is required when provided');
      }
      normalizedPayload.name = normalizedName;
    }

    if (payload.description !== undefined) {
      const normalizedDescription = String(payload.description || '').trim();
      normalizedPayload.description = normalizedDescription.length > 0 ? normalizedDescription : null;
    }

    if (payload.isActive !== undefined) {
      normalizedPayload.isActive = Boolean(payload.isActive);
    }

    await this.repository.updateRole(roleId, normalizedPayload);

    return {
      success: true,
      id: roleId,
      ...normalizedPayload,
    };
  }

  async getPermissions() {
    return this.repository.getPermissions();
  }

  async getDomains() {
    return this.repository.getDomains();
  }

  async getModules() {
    return this.repository.getModules();
  }

  async updateModule(
    id: number,
    payload: { domain?: string; department?: string | null; isActive?: boolean },
  ) {
    const normalizedPayload: { domain?: string; department?: string | null; isActive?: boolean } = {};

    if (payload.domain !== undefined) {
      const normalizedDomain = String(payload.domain || '').trim();
      if (!normalizedDomain) {
        throw new BadRequestException('domain is required when provided');
      }
      normalizedPayload.domain = normalizedDomain;
    }

    if (payload.department !== undefined) {
      const normalizedDepartment = String(payload.department || '').trim();
      normalizedPayload.department = normalizedDepartment.length > 0 ? normalizedDepartment : null;
    }

    if (payload.isActive !== undefined) {
      normalizedPayload.isActive = Boolean(payload.isActive);
    }

    await this.repository.updateModule(id, normalizedPayload);
    return { success: true, id, ...normalizedPayload };
  }

  async getUsers() {
    return this.repository.getUsers();
  }

  async getUserRoles(userId: number) {
    return this.repository.getUserRoles(userId);
  }

  async getUserPermissions(userId: number) {
    return this.repository.getUserPermissions(userId);
  }

  async getRolePermissions(roleId: number) {
    return this.repository.getRolePermissions(roleId);
  }

  async getUserRoleScopes(userId: number) {
    return this.repository.getUserRoleScopes(userId);
  }

  async replaceUserRoles(userId: number, roleIds: number[]) {
    if (!Array.isArray(roleIds)) {
      throw new BadRequestException('roleIds must be an array');
    }

    const normalizedRoleIds = Array.from(
      new Set(
        roleIds
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );

    await this.repository.replaceUserRoles(userId, normalizedRoleIds);
    return {
      success: true,
      userId,
      roleIds: normalizedRoleIds,
    };
  }

  async replaceRolePermissions(roleId: number, permissionIds: number[]) {
    if (!Array.isArray(permissionIds)) {
      throw new BadRequestException('permissionIds must be an array');
    }

    const normalizedPermissionIds = Array.from(
      new Set(
        permissionIds
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );

    await this.repository.replaceRolePermissions(roleId, normalizedPermissionIds);
    return {
      success: true,
      roleId,
      permissionIds: normalizedPermissionIds,
    };
  }

  async replaceUserRoleScopes(userId: number, scopeValues: string[]) {
    if (!Array.isArray(scopeValues)) {
      throw new BadRequestException('scopeValues must be an array');
    }

    const normalizedScopeValues = Array.from(
      new Set(
        scopeValues
          .map((value) => String(value || '').trim())
          .filter((value) => value.length > 0),
      ),
    );

    await this.repository.replaceUserRoleScopes(userId, normalizedScopeValues);
    return {
      success: true,
      userId,
      scopeValues: normalizedScopeValues,
    };
  }

  async getUserPermissionGrants(userId: number, domain?: string) {
    const normalizedDomain = domain ? String(domain).trim() : undefined;
    return this.repository.getUserPermissionGrants(userId, normalizedDomain);
  }

  async replaceUserDomainPermissionGrants(
    userId: number,
    body: { domain?: string; permissionIds?: number[]; grantedByUserId?: number },
  ) {
    const domain = String(body?.domain || '').trim();
    if (!domain) {
      throw new BadRequestException('domain is required');
    }

    if (!Array.isArray(body?.permissionIds)) {
      throw new BadRequestException('permissionIds must be an array');
    }

    const normalizedPermissionIds = Array.from(
      new Set(
        body.permissionIds
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );

    const grantedByUserId =
      Number.isInteger(Number(body?.grantedByUserId)) && Number(body?.grantedByUserId) > 0
        ? Number(body?.grantedByUserId)
        : userId;

    await this.repository.replaceUserDomainPermissionGrants(
      userId,
      domain,
      normalizedPermissionIds,
      grantedByUserId,
    );

    return {
      success: true,
      userId,
      domain,
      permissionIds: normalizedPermissionIds,
    };
  }

  async userHasRoles(userId: number, roleNames: string[]): Promise<boolean> {
    return this.repository.userHasRole(userId, roleNames);
  }

  async userHasPermissions(userId: number, permissionNames: string[]): Promise<boolean> {
    return this.repository.userHasPermissions(userId, permissionNames);
  }

  /**
   * Check if a user has a flat permission AND their domain scope covers the
   * specified domain. Checks active temporary grants first, then role-based scopes.
   */
  async userHasPermissionForDomain(
    userId: number,
    permissionName: string,
    domain: string,
  ): Promise<boolean> {
    return this.repository.userHasPermissionForDomain(userId, permissionName, domain);
  }

  async getModuleDomain(moduleKey: string): Promise<string | null> {
    return this.repository.getModuleDomain(moduleKey);
  }

  async getUserActiveGrants(userId: number, domain?: string) {
    return this.repository.getUserActiveGrants(userId, domain);
  }

  async submitPermissionRequest(payload: { userId?: number; permissionId?: number; domain?: string; reason?: string }) {
    const userId = Number(payload?.userId || 0);
    const permissionId = Number(payload?.permissionId || 0);
    const domain = String(payload?.domain || '').trim() || null;
    const reason = String(payload?.reason || '').trim() || null;

    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    if (!permissionId) {
      throw new BadRequestException('permissionId is required');
    }

    const requestId = await this.repository.createPermissionRequest(userId, permissionId, domain, reason);

    return {
      success: true,
      id: requestId,
      userId,
      permissionId,
      domain,
      reason,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
  }

  async getPermissionRequests(status?: string) {
    const validStatuses = ['pending', 'approved', 'denied', 'revoked', 'expired'];
    const normalizedStatus = status && validStatuses.includes(status) ? status : undefined;
    return this.repository.getPermissionRequests(normalizedStatus);
  }

  async approvePermissionRequest(
    requestId: number,
    reviewerId: number,
    expiresAt?: string | null,
  ) {
    if (!requestId || requestId <= 0) throw new BadRequestException('requestId is required');
    if (!reviewerId || reviewerId <= 0) throw new BadRequestException('reviewerId is required');

    try {
      await this.repository.approvePermissionRequest(requestId, reviewerId, expiresAt);
      return { success: true, requestId, status: 'approved' };
    } catch (err: any) {
      if (err?.message?.includes('not found')) throw new NotFoundException(err.message);
      throw new BadRequestException(err?.message || 'Failed to approve request');
    }
  }

  async denyPermissionRequest(
    requestId: number,
    reviewerId: number,
    reviewNotes?: string | null,
  ) {
    if (!requestId) throw new BadRequestException('requestId is required');
    if (!reviewerId) throw new BadRequestException('reviewerId is required');

    try {
      await this.repository.denyPermissionRequest(requestId, reviewerId, reviewNotes);
      return { success: true, requestId, status: 'denied' };
    } catch (err: any) {
      if (err?.message?.includes('not found')) throw new NotFoundException(err.message);
      throw new BadRequestException(err?.message || 'Failed to deny request');
    }
  }
}

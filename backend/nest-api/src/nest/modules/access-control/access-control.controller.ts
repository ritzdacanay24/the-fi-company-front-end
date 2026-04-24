import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { Permissions } from './permissions.decorator';
import { RolePermissionGuard } from './role-permission.guard';

@Controller('access-control')
@UseGuards(RolePermissionGuard)
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get('roles')
  async getRoles() {
    return this.accessControlService.getRoles();
  }

  @Post('roles')
  @Permissions('manage')
  async createRole(@Body() body: { name?: string; description?: string | null }) {
    return this.accessControlService.createRole(body || {});
  }

  @Patch('roles/:id')
  @Permissions('manage')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string | null; isActive?: boolean },
  ) {
    return this.accessControlService.updateRole(id, body || {});
  }

  @Get('permissions')
  async getPermissions() {
    return this.accessControlService.getPermissions();
  }

  @Get('domains')
  async getDomains() {
    return this.accessControlService.getDomains();
  }

  @Get('modules')
  async getModules() {
    return this.accessControlService.getModules();
  }

  @Patch('modules/:id')
  @Permissions('manage')
  async updateModule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { domain?: string; department?: string | null; isActive?: boolean },
  ) {
    return this.accessControlService.updateModule(id, body || {});
  }

  @Get('users')
  @Permissions('manage')
  async getUsers() {
    return this.accessControlService.getUsers();
  }

  @Get('users/:id/roles')
  @Permissions('manage')
  async getUserRoles(@Param('id', ParseIntPipe) id: number) {
    return this.accessControlService.getUserRoles(id);
  }

  @Get('users/:id/permissions')
  @Permissions('manage')
  async getUserPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.accessControlService.getUserPermissions(id);
  }

  @Get('roles/:id/permissions')
  @Permissions('manage')
  async getRolePermissions(@Param('id', ParseIntPipe) id: number) {
    return this.accessControlService.getRolePermissions(id);
  }

  @Get('users/:id/scopes')
  @Permissions('manage')
  async getUserRoleScopes(@Param('id', ParseIntPipe) id: number) {
    return this.accessControlService.getUserRoleScopes(id);
  }

  @Get('users/:id/grants')
  @Permissions('manage')
  async getUserPermissionGrants(
    @Param('id', ParseIntPipe) id: number,
    @Query('domain') domain?: string,
  ) {
    return this.accessControlService.getUserPermissionGrants(id, domain);
  }

  @Post('users/:id/roles')
  @Permissions('manage')
  async replaceUserRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { roleIds?: number[] },
  ) {
    return this.accessControlService.replaceUserRoles(id, body?.roleIds || []);
  }

  @Post('roles/:id/permissions')
  @Permissions('manage')
  async replaceRolePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { permissionIds?: number[] },
  ) {
    return this.accessControlService.replaceRolePermissions(id, body?.permissionIds || []);
  }

  @Post('users/:id/scopes')
  @Permissions('manage')
  async replaceUserRoleScopes(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { scopeValues?: string[] },
  ) {
    return this.accessControlService.replaceUserRoleScopes(id, body?.scopeValues || []);
  }

  @Post('users/:id/grants')
  @Permissions('manage')
  async replaceUserDomainPermissionGrants(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { domain?: string; permissionIds?: number[]; grantedByUserId?: number },
  ) {
    return this.accessControlService.replaceUserDomainPermissionGrants(id, body || {});
  }

  @Post('permission-requests')
  async submitPermissionRequest(
    @Body() body: { userId?: number; permissionId?: number; domain?: string; reason?: string },
  ) {
    return this.accessControlService.submitPermissionRequest(body || {});
  }

  @Get('permission-requests')
  @Permissions('manage')
  async getPermissionRequests(@Query('status') status?: string) {
    return this.accessControlService.getPermissionRequests(status);
  }

  @Put('permission-requests/:id/approve')
  @Permissions('manage')
  async approvePermissionRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { expiresAt?: string | null },
    @Req() req: any,
  ) {
    const reviewerId = Number(req?.user?.id || 0);
    return this.accessControlService.approvePermissionRequest(id, reviewerId, body?.expiresAt ?? null);
  }

  @Put('permission-requests/:id/deny')
  @Permissions('manage')
  async denyPermissionRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reviewNotes?: string | null },
    @Req() req: any,
  ) {
    const reviewerId = Number(req?.user?.id || 0);
    return this.accessControlService.denyPermissionRequest(id, reviewerId, body?.reviewNotes ?? null);
  }
}

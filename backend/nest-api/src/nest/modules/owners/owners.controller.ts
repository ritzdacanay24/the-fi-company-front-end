import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { OwnersService } from './owners.service';

@Controller('owners')
@UseGuards(RolePermissionGuard)
export class OwnersController {
  constructor(private readonly service: OwnersService) {}

  @Get()
  async getOwners(
    @Query('action') action?: string,
    @Query('active') active?: string,
    @Query('id') id?: string,
    @Query('user_id') userId?: string,
    @Query('owner_id') ownerId?: string,
  ) {
    if (action === 'dropdown-setting') {
      return this.service.getOwnerDropdownSetting();
    }

    if (action === 'for-user') {
      if (!userId) {
        return {
          success: false,
          error: 'user_id parameter is required',
        };
      }

      const activeOnly = String(active || '').toLowerCase() === 'true';
      return this.service.getOwnersForUser(userId, activeOnly);
    }

    if (action === 'users-for-owner') {
      if (!ownerId) {
        return {
          success: false,
          error: 'owner_id parameter is required',
        };
      }

      return this.service.getUsersForOwner(ownerId);
    }

    if (action === 'owner-assignments') {
      if (!userId) {
        return {
          success: false,
          error: 'user_id parameter is required',
        };
      }

      return this.service.getOwnerAssignmentsForUser(userId);
    }

    if (action === 'get-admin-users') {
      return this.service.getAdminUsers();
    }

    if (id) {
      return this.service.getOwnerById(id);
    }

    const activeOnly = String(active || '').toLowerCase() === 'true';
    return this.service.getAllOwners(activeOnly);
  }

  @Post()
  @Permissions('write')
  async postOwners(
    @Body() body: Record<string, unknown>,
    @Body('action') action?: string,
    @Body('enabled') enabled?: boolean,
    @Body('updated_by') updatedBy?: string,
  ) {
    if (action === 'set-dropdown-setting') {
      return this.service.setOwnerDropdownSetting(Boolean(enabled), updatedBy || 'system');
    }

    if (action === 'reorder') {
      return this.service.reorderOwners(
        (body.orders as Array<{ id: number; display_order: number }>) || [],
        String(body.user_id || 'system'),
      );
    }

    if (action === 'assign-to-user') {
      const userId = body.user_id as string | number | undefined;
      const ownerId = body.owner_id as string | number | undefined;
      if (!userId || !ownerId) {
        return {
          success: false,
          error: 'user_id and owner_id are required',
        };
      }

      return this.service.assignOwnerToUser(
        userId,
        ownerId,
        String(body.admin_user_id || 'system'),
      );
    }

    if (action === 'remove-from-user') {
      const userId = body.user_id as string | number | undefined;
      const ownerId = body.owner_id as string | number | undefined;
      if (!userId || !ownerId) {
        return {
          success: false,
          error: 'user_id and owner_id are required',
        };
      }

      return this.service.removeOwnerFromUser(
        userId,
        ownerId,
        String(body.admin_user_id || 'system'),
      );
    }

    if (action === 'add-admin-user') {
      const userId = body.user_id as string | number | undefined;
      if (!userId) {
        return {
          success: false,
          error: 'user_id is required',
        };
      }

      return this.service.addAdminUser(userId, String(body.created_by || body.user_id || 'system'));
    }

    if (action === 'remove-admin-user') {
      const userId = body.user_id as string | number | undefined;
      if (!userId) {
        return {
          success: false,
          error: 'user_id is required',
        };
      }

      return this.service.removeAdminUser(userId);
    }

    return this.service.createOwner(body, String(body.user_id || 'system'));
  }

  @Put()
  @Permissions('write')
  async putOwners(@Body() body: Record<string, unknown>) {
    const id = body.id as string | number | undefined;
    if (!id) {
      return {
        success: false,
        error: 'Owner ID is required for update',
      };
    }

    return this.service.updateOwner(id, body, String(body.user_id || 'system'));
  }

  @Delete()
  @Permissions('delete')
  async deleteOwners(@Body() body: Record<string, unknown>) {
    const id = body.id as string | number | undefined;
    if (!id) {
      return {
        success: false,
        error: 'Owner ID is required for deletion',
      };
    }

    return this.service.deleteOwner(id, String(body.user_id || 'system'));
  }
}

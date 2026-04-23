import { Injectable } from '@nestjs/common';
import { OwnersRepository } from './owners.repository';

type GenericRow = Record<string, unknown>;

@Injectable()
export class OwnersService {
  constructor(private readonly repository: OwnersRepository) {}

  private parseBoolean(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }

    return fallback;
  }

  async getOwnerDropdownSetting(): Promise<Record<string, unknown>> {
    try {
      const enabled = await this.repository.getOwnerDropdownSetting();
      return {
        success: true,
        data: {
          enabled,
        },
      };
    } catch {
      // Legacy behavior defaults to enabled when settings table/row is unavailable.
      return {
        success: true,
        data: {
          enabled: true,
        },
      };
    }
  }

  async getOwnersForUser(userId: string | number, activeOnly = true): Promise<Record<string, unknown>> {
    try {
      const isAdmin = await this.repository.isAdmin(userId);
      if (isAdmin) {
        return this.getAllOwners(activeOnly);
      }

      const owners = await this.repository.getOwnersForUser(userId, activeOnly);
      return {
        success: true,
        data: owners,
        count: owners.length,
        is_admin: false,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch owners for user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getUsersForOwner(ownerId: string | number): Promise<Record<string, unknown>> {
    try {
      const users = await this.repository.getUsersForOwner(ownerId);
      return {
        success: true,
        data: users,
        count: users.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getOwnerAssignmentsForUser(userId: string | number): Promise<Record<string, unknown>> {
    try {
      const owners = await this.repository.getOwnerAssignmentsForUser(userId);
      return {
        success: true,
        data: owners,
        count: owners.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch owner assignments: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getAdminUsers(): Promise<Record<string, unknown>> {
    try {
      const admins = await this.repository.getAdminUsers();
      return {
        success: true,
        data: admins,
        count: admins.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch admin users: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async createOwner(data: GenericRow, createdBy = 'system'): Promise<Record<string, unknown>> {
    try {
      const isAdmin = await this.repository.isAdmin(createdBy);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Insufficient permissions. Admin access required.',
        };
      }

      const ownerName = String(data.name || '').trim();
      if (!ownerName) {
        return {
          success: false,
          error: 'Owner name is required',
        };
      }

      const duplicateExists = await this.repository.existsOwnerByName(ownerName);
      if (duplicateExists) {
        return {
          success: false,
          error: 'An owner with this name already exists',
        };
      }

      const id = await this.repository.createOwner({
        name: ownerName,
        email: (data.email as string) ?? null,
        department: (data.department as string) ?? null,
        description: (data.description as string) ?? null,
        display_order: Number(data.display_order ?? 999),
        is_active: this.parseBoolean(data.is_active, true),
        is_production: this.parseBoolean(data.is_production, false),
        created_by: createdBy,
      });

      return {
        success: true,
        message: 'Owner created successfully',
        id,
      };
    } catch (error) {
      return {
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async updateOwner(id: string | number, data: GenericRow, updatedBy = 'system'): Promise<Record<string, unknown>> {
    try {
      const isAdmin = await this.repository.isAdmin(updatedBy);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Insufficient permissions. Admin access required.',
        };
      }

      const ownerExists = await this.repository.existsOwnerById(id);
      if (!ownerExists) {
        return {
          success: false,
          error: 'Owner not found',
        };
      }

      const allowedFields = ['name', 'email', 'department', 'description', 'display_order', 'is_active', 'is_production'];
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];

      for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
          updateFields.push(`${field} = ?`);
          if (field === 'is_active' || field === 'is_production') {
            updateValues.push(this.parseBoolean(data[field], false) ? 1 : 0);
          } else {
            updateValues.push(data[field]);
          }
        }
      }

      if (!updateFields.length) {
        return {
          success: false,
          error: 'No valid fields to update',
        };
      }

      updateFields.push('updated_by = ?');
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(updatedBy);

      await this.repository.updateOwner(id, updateFields, updateValues);
      return {
        success: true,
        message: 'Owner updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async deleteOwner(id: string | number, deletedBy = 'system'): Promise<Record<string, unknown>> {
    try {
      const isAdmin = await this.repository.isAdmin(deletedBy);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Insufficient permissions. Admin access required.',
        };
      }

      const affectedRows = await this.repository.softDeleteOwner(id, deletedBy);
      if (affectedRows > 0) {
        return {
          success: true,
          message: 'Owner deactivated successfully',
        };
      }

      return {
        success: false,
        error: 'Owner not found or already inactive',
      };
    } catch (error) {
      return {
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async reorderOwners(
    orders: Array<{ id: number; display_order: number }>,
    updatedBy = 'system',
  ): Promise<Record<string, unknown>> {
    try {
      const isAdmin = await this.repository.isAdmin(updatedBy);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Insufficient permissions. Admin access required.',
        };
      }

      for (const order of orders) {
        if (!order?.id || typeof order.display_order === 'undefined') {
          return {
            success: false,
            error: 'Invalid order update data',
          };
        }
      }

      await this.repository.reorderOwners(orders, updatedBy);
      return {
        success: true,
        message: 'Owner order updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to reorder owners: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async assignOwnerToUser(
    userId: string | number,
    ownerId: string | number,
    createdBy = 'system',
  ): Promise<Record<string, unknown>> {
    try {
      const isAdmin = await this.repository.isAdmin(createdBy);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Insufficient permissions. Admin access required.',
        };
      }

      const exists = await this.repository.ownerAssignmentExists(userId, ownerId);
      if (exists) {
        return {
          success: false,
          error: 'Owner is already assigned to this user',
        };
      }

      await this.repository.assignOwnerToUser(userId, ownerId, createdBy);
      return {
        success: true,
        message: 'Owner assigned to user successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async removeOwnerFromUser(
    userId: string | number,
    ownerId: string | number,
    deletedBy = 'system',
  ): Promise<Record<string, unknown>> {
    try {
      const isAdmin = await this.repository.isAdmin(deletedBy);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Insufficient permissions. Admin access required.',
        };
      }

      const affectedRows = await this.repository.removeOwnerFromUser(userId, ownerId);
      if (affectedRows > 0) {
        return {
          success: true,
          message: 'Owner assignment removed successfully',
        };
      }

      return {
        success: false,
        error: 'Assignment not found',
      };
    } catch (error) {
      return {
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async addAdminUser(userId: string | number, createdBy = 'system'): Promise<Record<string, unknown>> {
    try {
      const exists = await this.repository.adminUserExists(userId);
      if (exists) {
        return {
          success: false,
          error: 'User is already an admin',
        };
      }

      await this.repository.addAdminUser(userId, createdBy);
      return {
        success: true,
        message: 'Admin user added successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add admin user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async removeAdminUser(userId: string | number): Promise<Record<string, unknown>> {
    try {
      const affectedRows = await this.repository.removeAdminUser(userId);
      if (affectedRows > 0) {
        return {
          success: true,
          message: 'Admin access removed successfully',
        };
      }

      return {
        success: false,
        error: 'Admin user not found',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove admin user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async setOwnerDropdownSetting(enabled: boolean, updatedBy = 'system'): Promise<Record<string, unknown>> {
    try {
      await this.repository.setOwnerDropdownSetting(enabled, updatedBy);
      return {
        success: true,
        message: 'Owner dropdown setting updated successfully',
        data: {
          enabled,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update setting: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getAllOwners(activeOnly = false): Promise<Record<string, unknown>> {
    try {
      const owners = await this.repository.getAllOwners(activeOnly);
      return {
        success: true,
        data: owners,
        count: owners.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch owners: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getOwnerById(id: string | number): Promise<Record<string, unknown>> {
    try {
      const owner = await this.repository.getOwnerById(id);
      if (!owner) {
        return {
          success: false,
          error: 'Owner not found',
        };
      }

      return {
        success: true,
        data: owner,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch owner: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get production status map for owners (name -> is_production)
   */
  async getProductionStatusMap(): Promise<Record<string, boolean>> {
    const rows = await this.repository.getActiveWithProductionStatus();
    const map: Record<string, boolean> = {};
    for (const row of rows) {
      const key = String(row.name || '').trim().toUpperCase();
      if (key) {
        map[key] = Number(row.is_production) === 1;
      }
    }
    return map;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentsRepository } from './departments.repository';

@Injectable()
export class DepartmentsService {
  constructor(private readonly repository: DepartmentsRepository) {}

  async getDepartments(includeInactive = false) {
    const rows = await this.repository.getDepartments(includeInactive);
    return {
      success: true,
      data: rows,
      count: rows.length,
    };
  }

  async getAvailableUsers() {
    const rows = await this.repository.getAvailableUsers();
    return {
      success: true,
      data: rows,
    };
  }

  async createDepartment(payload: { department_name?: string; department_head_user_id?: number | null; display_order?: number | null }) {
    const departmentName = String(payload?.department_name || '').trim();
    const departmentHeadUserId = Number(payload?.department_head_user_id);
    const displayOrder = Number(payload?.display_order);

    if (!departmentName) {
      return { success: false, error: 'department_name is required' };
    }

    const departmentId = await this.repository.createDepartmentPlaceholder(departmentName);
    await this.repository.upsertDepartmentRecord(departmentName, {
      departmentHeadUserId: Number.isFinite(departmentHeadUserId) && departmentHeadUserId > 0 ? departmentHeadUserId : null,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
    });

    return {
      success: true,
      message: 'Department created successfully',
      department_id: departmentId,
    };
  }

  async updateDepartment(payload: { id?: number; department_name?: string; department_head_user_id?: number | null; display_order?: number | null }) {
    const id = Number(payload?.id);
    const departmentName = String(payload?.department_name || '').trim();
    const departmentHeadUserId = Number(payload?.department_head_user_id);
    const displayOrder = Number(payload?.display_order);

    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, error: 'Department ID required' };
    }

    if (!departmentName) {
      return { success: false, error: 'department_name is required' };
    }

    const existingDepartment = await this.repository.resolveDepartmentReference(id);
    if (!existingDepartment) {
      return { success: false, error: 'Department not found' };
    }

    const previousDepartmentName = String(existingDepartment.department_name || '').trim();

    if (existingDepartment.placeholder_id) {
      const affectedRows = await this.repository.updateDepartmentPlaceholder(existingDepartment.placeholder_id, departmentName);
      if (affectedRows === 0) {
        return { success: false, error: 'Department not found' };
      }
    }

    await this.repository.upsertDepartmentRecord(departmentName, {
      previousDepartmentName,
      departmentHeadUserId: Number.isFinite(departmentHeadUserId) && departmentHeadUserId > 0 ? departmentHeadUserId : null,
      displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
    });

    return {
      success: true,
      message: 'Department updated successfully',
    };
  }

  async deleteDepartment(departmentId: number) {
    const dept = await this.repository.resolveDepartmentReference(departmentId);
    if (!dept) {
      return { success: false, error: 'Department not found' };
    }

    const departmentName = String(dept.department_name || '').trim();
    if (!departmentName) {
      throw new NotFoundException('Department name could not be determined');
    }

    const userCount = await this.repository.countUsersInDepartment(departmentName);
    if (userCount > 0) {
      return {
        success: false,
        error: `Cannot delete department with assigned users (${userCount} users found)`,
      };
    }

    if (dept.placeholder_id) {
      const affectedRows = await this.repository.deleteDepartmentPlaceholder(dept.placeholder_id);
      if (affectedRows === 0) {
        return { success: false, error: 'Department not found' };
      }
    }

    await this.repository.deactivateDepartmentRecord(departmentName);

    return {
      success: true,
      message: 'Department deleted successfully',
    };
  }

  async assignUser(payload: { user_id?: number; department_id?: number }) {
    const userId = Number(payload?.user_id);
    const departmentId = Number(payload?.department_id);

    if (!Number.isFinite(userId) || userId <= 0 || !Number.isFinite(departmentId) || departmentId <= 0) {
      return { success: false, error: 'user_id and department_id are required' };
    }

    const dept = await this.repository.resolveDepartmentReference(departmentId);
    if (!dept) {
      return { success: false, error: 'Department not found' };
    }

    const departmentName = String(dept.department_name || '').trim();
    if (!departmentName) {
      return { success: false, error: 'Department name could not be determined' };
    }
    const userExists = await this.repository.findActiveUserById(userId);

    if (!userExists) {
      return { success: false, error: 'User not found' };
    }

    await this.repository.assignUserToDepartment(userId, departmentName);

    return {
      success: true,
      message: 'User assigned to department successfully',
    };
  }

  async setDepartmentActive(payload: { department_id?: number; is_active?: number | boolean }) {
    const departmentId = Number(payload?.department_id);
    const isActive = Number(payload?.is_active) === 1 || payload?.is_active === true;

    if (!Number.isFinite(departmentId) || departmentId <= 0) {
      return { success: false, error: 'department_id is required' };
    }

    const dept = await this.repository.resolveDepartmentReference(departmentId);
    if (!dept) {
      return { success: false, error: 'Department not found' };
    }

    const recordId = Number(dept.department_record_id || 0);
    if (!recordId) {
      return { success: false, error: 'Department record not found' };
    }

    await this.repository.setDepartmentRecordActiveById(recordId, isActive);

    if (dept.placeholder_id) {
      await this.repository.setDepartmentPlaceholderActiveById(Number(dept.placeholder_id), isActive);
    }

    return {
      success: true,
      message: `Department marked as ${isActive ? 'active' : 'inactive'} successfully`,
    };
  }

  async removeUser(userId: number) {
    const userExists = await this.repository.findActiveUserById(userId);
    if (!userExists) {
      return { success: false, error: 'User not found' };
    }

    await this.repository.removeUserFromDepartment(userId);

    return {
      success: true,
      message: 'User removed from department successfully',
    };
  }
}

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

  async createDepartment(payload: { department_name?: string }) {
    const departmentName = String(payload?.department_name || '').trim();
    if (!departmentName) {
      return { success: false, error: 'department_name is required' };
    }

    const departmentId = await this.repository.createDepartment(departmentName);
    return {
      success: true,
      message: 'Department created successfully',
      department_id: departmentId,
    };
  }

  async updateDepartment(payload: { id?: number; department_name?: string }) {
    const id = Number(payload?.id);
    const departmentName = String(payload?.department_name || '').trim();

    if (!Number.isFinite(id) || id <= 0) {
      return { success: false, error: 'Department ID required' };
    }

    if (!departmentName) {
      return { success: false, error: 'department_name is required' };
    }

    const affectedRows = await this.repository.updateDepartmentPlaceholder(id, departmentName);
    if (affectedRows === 0) {
      return { success: false, error: 'Department not found' };
    }

    return {
      success: true,
      message: 'Department updated successfully',
    };
  }

  async deleteDepartment(departmentId: number) {
    const dept = await this.repository.findDepartmentPlaceholderById(departmentId);
    if (!dept) {
      return { success: false, error: 'Department not found' };
    }

    const departmentName = String(dept.org_chart_department || dept.department || '').trim();
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

    const affectedRows = await this.repository.deleteDepartmentPlaceholder(departmentId);
    if (affectedRows === 0) {
      return { success: false, error: 'Department not found' };
    }

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

    const dept = await this.repository.findDepartmentPlaceholderById(departmentId);
    if (!dept) {
      return { success: false, error: 'Department not found' };
    }

    const departmentName = String(dept.org_chart_department || dept.department || '').trim();
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

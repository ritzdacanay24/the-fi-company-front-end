import { Body, Controller, Delete, Get, Put, Post, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { DepartmentsService } from './departments.service';

@Controller('departments')
@UseGuards(RolePermissionGuard)
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Get()
  async get(
    @Query('action') action?: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    if (action === 'users') {
      return this.service.getAvailableUsers();
    }

    const include = includeInactive === 'true' || includeInactive === '1';
    return this.service.getDepartments(include);
  }

  @Post()
  async post(@Body() payload: { action?: string; user_id?: number; department_id?: number; department_name?: string }) {
    if (payload?.action === 'assign') {
      return this.service.assignUser(payload);
    }

    return this.service.createDepartment(payload);
  }

  @Put()
  async put(@Body() payload: { id?: number; department_name?: string }) {
    return this.service.updateDepartment(payload);
  }

  @Delete()
  async remove(@Query('id') departmentId?: string, @Query('user_id') userId?: string) {
    if (userId) {
      return this.service.removeUser(Number(userId));
    }

    return this.service.deleteDepartment(Number(departmentId || 0));
  }
}

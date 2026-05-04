import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { ProjectManagerService, UpsertIntakeDto, UpsertProjectDto } from './project-manager.service';

@Controller('operations/project-manager')
@UseGuards(RolePermissionGuard)
export class ProjectManagerController {
  constructor(private readonly service: ProjectManagerService) {}

  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Post()
  @Permissions('write')
  async upsert(@Body() dto: UpsertProjectDto) {
    return this.service.upsert(dto);
  }

  @Delete(':id')
  @Permissions('write')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Get(':id/intake')
  async getIntake(@Param('id') id: string) {
    return this.service.getIntake(id);
  }

  @Put(':id/intake')
  @Permissions('write')
  async upsertIntake(@Param('id') id: string, @Body() dto: UpsertIntakeDto) {
    return this.service.upsertIntake(id, dto);
  }
}

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { ActivityEntityType } from './pm-activity-log.repository';
import { PmActivityLogService } from './pm-activity-log.service';

@Controller('operations/project-manager')
@UseGuards(RolePermissionGuard)
export class PmActivityLogController {
  constructor(private readonly service: PmActivityLogService) {}

  @Get(':projectId/activity')
  getActivity(
    @Param('projectId') projectId: string,
    @Query('entityType') entityType?: ActivityEntityType,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getForProject(projectId, {
      entityType,
      entityId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}

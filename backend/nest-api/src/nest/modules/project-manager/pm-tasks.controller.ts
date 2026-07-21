import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { PmTasksService, TaskStateDto, AddCommentDto, AddAttachmentDto } from './pm-tasks.service';

@Controller('operations/project-manager')
@UseGuards(RolePermissionGuard)
export class PmTasksController {
  constructor(private readonly pmTasksService: PmTasksService) {}
  /** GET /operations/project-manager/:projectId/tasks */
  @Get(':projectId/tasks')
  async getState(@Param('projectId') projectId: string) {
    return this.pmTasksService.getState(projectId);
  }

  /** PUT /operations/project-manager/:projectId/tasks — replace full task list */
  @Put(':projectId/tasks')
  @Permissions('write')
  async saveState(
    @Param('projectId') projectId: string,
    @Body() dto: TaskStateDto,
    @CurrentUserId() currentUserId: number,
  ) {
    await this.pmTasksService.saveState(projectId, dto, currentUserId);
    return { success: true };
  }

  /** POST /operations/project-manager/tasks/:taskId/comments */
  @Post('tasks/:taskId/comments')
  @Permissions('write')
  async addComment(@Param('taskId') taskId: string, @Body() dto: AddCommentDto) {
    const id = await this.pmTasksService.addComment(Number(taskId), dto);
    return { id };
  }

  /** POST /operations/project-manager/tasks/:taskId/attachments */
  @Post('tasks/:taskId/attachments')
  @Permissions('write')
  async addAttachment(@Param('taskId') taskId: string, @Body() dto: AddAttachmentDto) {
    const id = await this.pmTasksService.addAttachment(Number(taskId), dto);
    return { id };
  }
}

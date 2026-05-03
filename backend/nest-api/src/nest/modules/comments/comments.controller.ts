import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { Permissions, RolePermissionGuard } from '../access-control';
import { CommentsService } from './comments.service';

@Controller('comments')
@UseGuards(RolePermissionGuard)
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Get('find')
  async find(
    @Query('orderNum') orderNum?: string,
    @Query('type') type?: string,
    @Query('active') active?: string,
  ) {
    return this.service.find(orderNum, type, active);
  }

  @Post('create')
  @Permissions('write')
  async create(
    @CurrentUserId() currentUserId: number,
    @Body()
    payload: {
      comments?: string;
      orderNum?: string;
      type?: string;
      locationPath?: string;
      pageName?: string;
      comments_html?: string;
      pid?: string | number | null;
    },
  ) {
    return this.service.create(payload, currentUserId);
  }

  @Post('delete')
  @Permissions('write')
  async delete(
    @CurrentUserId() currentUserId: number,
    @Body() payload: { id?: number | string; active?: number | string },
  ) {
    return this.service.delete(payload, currentUserId);
  }
}

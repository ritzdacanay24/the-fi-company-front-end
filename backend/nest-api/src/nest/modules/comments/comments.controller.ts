import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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
    @Body()
    payload: {
      comments?: string;
      orderNum?: string;
      userId?: number | string;
      type?: string;
      locationPath?: string;
      pageName?: string;
      comments_html?: string;
      pid?: string | number | null;
    },
  ) {
    return this.service.create(payload);
  }

  @Post('delete')
  @Permissions('delete')
  async delete(@Body() payload: { id?: number | string; active?: number | string }) {
    return this.service.delete(payload);
  }
}

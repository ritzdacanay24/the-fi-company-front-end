import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { JobCommentsService } from './job-comments.service';

@Controller('job-comments')
@UseGuards(RolePermissionGuard)
export class JobCommentsController {
  constructor(private readonly service: JobCommentsService) {}

  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Get('getJobCommentsByFsId')
  async getJobCommentsByFsId(@Query('fsId', ParseIntPipe) fsId: number) {
    return this.service.getJobCommentsByFsId(fsId);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  @Permissions('write')
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put(':id')
  @Permissions('write')
  async update(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.update(id, payload);
  }

  @Delete(':id')
  @Permissions('delete')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}

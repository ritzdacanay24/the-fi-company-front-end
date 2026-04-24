import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { RequestCommentsService } from './request-comments.service';

@Controller('request-comments')
@UseGuards(RolePermissionGuard)
export class RequestCommentsController {
  constructor(private readonly service: RequestCommentsService) {}

  @Get()
  async getAllOrByRequestId(
    @Query('fsRequestId') fsRequestId?: string,
    @Query('fs_request_id') legacyFsRequestId?: string,
  ) {
    const requestId = fsRequestId || legacyFsRequestId;
    if (!requestId) {
      return this.service.getAll();
    }

    const parsedId = Number(requestId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException('fsRequestId must be a positive integer');
    }

    return this.service.getByRequestId(parsedId);
  }

  @Get('getByRequestId')
  async getByRequestId(@Query('fs_request_id', ParseIntPipe) fsRequestId: number) {
    return this.service.getByRequestId(fsRequestId);
  }

  @Post()
  @Permissions('write')
  async create(
    @Body() payload: Record<string, unknown>,
    @Query('token') token?: string,
    @Query('toEmail') toEmail?: string,
  ) {
    return this.service.createComment(token, toEmail, payload);
  }

  @Post('createComment')
  @Permissions('write')
  async createComment(
    @Query('token') token: string,
    @Query('toEmail') toEmail: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.createComment(token, toEmail, payload);
  }

  @Put(':id')
  @Permissions('write')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Put('updateById')
  @Permissions('write')
  async updateById(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }
}

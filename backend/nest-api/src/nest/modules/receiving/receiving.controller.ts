import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { ReceivingService } from './receiving.service';

@Controller('receiving/read')
@UseGuards(RolePermissionGuard)
export class ReceivingController {
  constructor(private readonly service: ReceivingService) {}

  @Get()
  async read(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('id') id?: string,
    @Query('getAttachment') getAttachment?: string,
  ) {
    if (getAttachment) {
      return this.service.getAttachment(getAttachment);
    }

    if (id) {
      return this.service.getById(id);
    }

    return this.service.getOpenPo(start || '', end || '');
  }

  @Post()
  @Permissions('write')
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put()
  @Permissions('write')
  async update(@Query('id') id?: string, @Body() payload?: Record<string, unknown>) {
    return this.service.update(id || '', payload || {});
  }

  @Delete()
  @Permissions('delete')
  async delete(
    @Query('id') id?: string,
    @Query('deleteAttachment') deleteAttachment?: string,
  ) {
    if (deleteAttachment) {
      return this.service.deleteAttachment(deleteAttachment);
    }

    return this.service.delete(id || '');
  }
}

import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { FsQirService } from './fs-qir.service';

@Controller('fs-qir')
@UseGuards(RolePermissionGuard)
export class FsQirController {
  constructor(private readonly service: FsQirService) {}

  @Get('getByWorkOrderId')
  getByWorkOrderId(@Query('workOrderId') workOrderIdRaw?: string) {
    const workOrderId = Number(workOrderIdRaw);
    if (!Number.isFinite(workOrderId)) {
      return [];
    }

    return this.service.getByWorkOrderId(workOrderId);
  }

  @Get('getById')
  getById(@Query('id') idRaw?: string) {
    const id = Number(idRaw);
    if (!Number.isFinite(id)) {
      return null;
    }

    return this.service.getById(id);
  }

  @Post('create')
  @Permissions('write')
  create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put('updateById')
  @Permissions('write')
  updateById(@Query('id') idRaw: string, @Body() payload: Record<string, unknown>) {
    const id = Number(idRaw);
    if (!Number.isFinite(id)) {
      return { affectedRows: 0 };
    }

    return this.service.updateById(id, payload);
  }

  @Delete('deleteById')
  @Permissions('delete')
  deleteById(@Query('id') idRaw?: string) {
    const id = Number(idRaw);
    if (!Number.isFinite(id)) {
      return { affectedRows: 0 };
    }

    return this.service.deleteById(id);
  }
}

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { FileInterceptor } from '@nestjs/platform-express';
import { TripExpenseService } from './trip-expense.service';

@Controller('trip-expense')
@UseGuards(RolePermissionGuard)
export class TripExpenseController {
  constructor(private readonly service: TripExpenseService) {}

  @Get('getByWorkOrderId')
  getByWorkOrderId(@Query('workOrderId') workOrderIdRaw?: string) {
    const workOrderId = Number(workOrderIdRaw);
    if (!Number.isFinite(workOrderId)) {
      return [];
    }

    return this.service.getByWorkOrderId(workOrderId);
  }

  @Get('getByFsId')
  getByFsId(@Query('fs_scheduler_id') fsSchedulerIdRaw?: string) {
    const fsSchedulerId = Number(fsSchedulerIdRaw);
    if (!Number.isFinite(fsSchedulerId)) {
      return [];
    }

    return this.service.getByFsId(fsSchedulerId);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  @Permissions('write')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() payload: Record<string, unknown> = {},
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    return this.service.create(payload, file);
  }

  @Put(':id')
  @Permissions('write')
  @UseInterceptors(FileInterceptor('file'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown> = {},
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    return this.service.update(id, payload, file);
  }

  @Delete(':id')
  @Permissions('delete')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}

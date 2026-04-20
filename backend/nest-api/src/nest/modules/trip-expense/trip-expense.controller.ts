import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { TripExpenseService } from './trip-expense.service';

@Controller('trip-expense')
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
  create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.update(id, payload);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}

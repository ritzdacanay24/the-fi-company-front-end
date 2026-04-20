import { Controller, Get, Query } from '@nestjs/common';
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
}

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { TripExpenseTransactionsService } from './trip-expense-transactions.service';

@Controller('trip-expense-transactions')
export class TripExpenseTransactionsController {
  constructor(private readonly service: TripExpenseTransactionsService) {}

  @Get('getByWorkOrderId')
  getByWorkOrderId(@Query('workOrderId') workOrderIdRaw?: string) {
    const workOrderId = Number(workOrderIdRaw);
    if (!Number.isFinite(workOrderId)) {
      return [];
    }

    return this.service.getByWorkOrderId(workOrderId);
  }

  @Get('getByFsId')
  getByFsId(@Query('fsId') fsIdRaw?: string, @Query('workOrderId') workOrderIdRaw?: string) {
    const fsId = Number(fsIdRaw);
    if (!Number.isFinite(fsId)) {
      return [];
    }

    const workOrderId = Number(workOrderIdRaw);
    const safeWorkOrderId = Number.isFinite(workOrderId) ? workOrderId : undefined;

    return this.service.getByFsId(fsId, safeWorkOrderId);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put('updateCreditCardTransactionById/:id')
  updateCreditCardTransactionById(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateCreditCardTransactionById(id, payload);
  }

  @Delete(':id')
  deleteById(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }
}

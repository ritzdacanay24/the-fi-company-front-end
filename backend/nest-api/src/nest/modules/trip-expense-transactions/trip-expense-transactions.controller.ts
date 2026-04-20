import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TripExpenseTransactionsService } from './trip-expense-transactions.service';
import { UploadedSpreadsheetFile } from './types';

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

  @Get('findByDateRange')
  findByDateRange(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    if (!dateFrom || !dateTo) {
      return [];
    }

    return this.service.findByDateRange(dateFrom, dateTo);
  }

  @Get('getChart')
  getChart(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('displayCustomers') displayCustomers?: string,
    @Query('typeOfView') typeOfView?: string,
  ) {
    if (!dateFrom || !dateTo) {
      return { summary: [], chartData1: { obj: [], chart: {}, chartnew: {} }, chartData: [] };
    }

    return this.service.getChart(dateFrom, dateTo, displayCustomers || 'Show All', typeOfView || 'Monthly');
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Post('emailMissingReceiptsToTechs')
  emailMissingReceiptsToTechs(
    @Query('fsId') fsIdRaw?: string,
    @Query('ticketNumber') ticketNumber?: string,
    @Body() rows: Array<Record<string, unknown>> = [],
  ) {
    const fsId = Number(fsIdRaw);
    if (!Number.isFinite(fsId)) {
      return [];
    }

    return this.service.emailMissingReceiptsToTechs(fsId, ticketNumber || '', rows);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: UploadedSpreadsheetFile,
    @Query('monthAndYear') monthAndYear?: string,
  ) {
    return this.service.uploadCreditCardTransactions(file, monthAndYear || '');
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

import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { SalesOrderSearchService } from './sales-order-search.service';

@Controller('sales-order-search')
export class SalesOrderSearchController {
  constructor(private readonly service: SalesOrderSearchService) {}

  @Get('read')
  async read(@Query('order') order?: string) {
    const normalized = String(order || '').trim();
    if (!normalized) {
      throw new BadRequestException('order is required');
    }
    return this.service.read(normalized);
  }

  @Get('customer-order-numbers')
  async getCustomerOrderNumbers(@Query('customerOrderNumber') customerOrderNumber?: string) {
    const normalized = String(customerOrderNumber || '').trim();
    if (!normalized) {
      throw new BadRequestException('customerOrderNumber is required');
    }
    return this.service.getCustomerOrderNumbers(normalized);
  }

  @Get('transactions')
  async getTransactions(@Query('order') order?: string) {
    const normalized = String(order || '').trim();
    if (!normalized) {
      throw new BadRequestException('order is required');
    }
    return this.service.getTransactions(normalized);
  }
}
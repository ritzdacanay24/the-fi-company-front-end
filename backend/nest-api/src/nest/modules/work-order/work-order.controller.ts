import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { WorkOrderService } from './work-order.service';

@Controller('work-order')
@UseGuards(RolePermissionGuard)
export class WorkOrderController {
  constructor(private readonly service: WorkOrderService) {}

  @Get('findOne')
  async findOne(@Query() params: Record<string, unknown>) {
    return this.service.findOne(params);
  }

  @Get('getAll')
  async getAll(
    @Query('selectedViewType') selectedViewType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('isAll') isAll?: string,
  ) {
    return this.service.getAll(selectedViewType, dateFrom, dateTo, isAll);
  }

  @Get('getByWorkOrderId')
  async getByWorkOrderId(@Query('workOrderId', ParseIntPipe) workOrderId: number) {
    return this.service.getByWorkOrderId(workOrderId);
  }

  @Get('details')
  async getDetails(@Query('workOrderNumber') workOrderNumber?: string) {
    return this.service.getDetailsByWorkOrderNumber(workOrderNumber || '');
  }

  @Get('completedWorkOrders')
  async getCompletedWorkOrders() {
    return this.service.getCompletedWorkOrders();
  }

  @Get('legacy-read')
  async legacyRead(@Query('order') order?: string) {
    return this.service.getLegacyReadByWorkOrderNumber(order || '');
  }

  @Get('customer-order-numbers')
  async getCustomerOrderNumbers(@Query('customerOrderNumber') customerOrderNumber?: string) {
    return this.service.getLegacyCustomerOrderNumbers(customerOrderNumber || '');
  }

  @Get('transactions')
  async getTransactions(@Query('order') order?: string) {
    return this.service.getLegacyTransactions(order || '');
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
  async updateById(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.updateById(id, payload);
  }

  @Put('billing-review/:id')
  @Permissions('write')
  async updateByIdBillingReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateByIdBillingReview(id, payload);
  }

  @Delete(':id')
  @Permissions('delete')
  async deleteById(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }
}

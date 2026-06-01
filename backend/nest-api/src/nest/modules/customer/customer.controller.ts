import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import {
  CustomerNotificationRecipientDto,
  CustomerService,
  UpsertCustomerNotificationRecipientDto,
} from './customer.service';

interface UpdateCustomerNotificationRecipientsDto {
  recipients: UpsertCustomerNotificationRecipientDto[];
}

@Controller('customer')
@UseGuards(RolePermissionGuard)
export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Get(':id/notification-recipients')
  async getNotificationRecipients(@Param('id', ParseIntPipe) id: number): Promise<CustomerNotificationRecipientDto[]> {
    return this.service.listNotificationRecipients(id);
  }

  @Put(':id/notification-recipients')
  @Permissions('write')
  async updateNotificationRecipients(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCustomerNotificationRecipientsDto,
  ): Promise<CustomerNotificationRecipientDto[]> {
    return this.service.updateNotificationRecipients(id, payload?.recipients ?? []);
  }

  @Delete(':id/notification-recipients/:recipientId')
  @Permissions('write')
  async deleteNotificationRecipient(
    @Param('id', ParseIntPipe) id: number,
    @Param('recipientId', ParseIntPipe) recipientId: number,
  ) {
    return this.service.deleteNotificationRecipient(id, recipientId);
  }

  @Post()
  @Permissions('write')
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put(':id')
  @Permissions('write')
  async update(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.update(id, payload);
  }

  @Delete(':id')
  @Permissions('delete')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}

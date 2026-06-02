import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, StreamableFile, UseGuards, Header } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { ShippingChecklistsService } from './shipping-checklists.service';

@Controller('shipping-checklists')
@UseGuards(RolePermissionGuard)
export class ShippingChecklistsController {
  constructor(private readonly service: ShippingChecklistsService) {}

  @Get('bootstrap')
  @Permissions('read')
  async bootstrap(@Query('customerCode') customerCode?: string) {
    return this.service.bootstrap(customerCode);
  }

  @Get('templates')
  @Permissions('read')
  async getTemplates(@Query('customerCode') customerCode?: string) {
    return this.service.getTemplates(customerCode);
  }

  @Post('templates/upsert')
  @Permissions('manage')
  async upsertTemplate(@Body() payload: Record<string, unknown>) {
    return this.service.upsertTemplate(payload);
  }

  @Get('settings/customers')
  @Permissions('manage')
  async getCustomerSettings() {
    return this.service.getCustomerSettings();
  }

  @Post('settings/customers/upsert')
  @Permissions('manage')
  async upsertCustomerSetting(@Body() payload: Record<string, unknown>) {
    return this.service.upsertCustomerSetting(payload);
  }

  @Get('instances')
  @Permissions('read')
  async getInstances(@Query('customerCode') customerCode?: string, @Query('limit') limit?: string) {
    return this.service.getInstances(customerCode, limit);
  }

  @Get('instances/:id')
  @Permissions('read')
  async getInstanceById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getInstanceById(id);
  }

  @Get('instances/:id/pdf')
  @Permissions('read')
  @Header('Content-Type', 'application/pdf')
  async getInstancePdf(@Param('id', ParseIntPipe) id: number): Promise<StreamableFile> {
    const result = await this.service.getInstancePdf(id);
    return new StreamableFile(result.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${result.fileName}"`,
    });
  }

  @Post('instances/upsert')
  @Permissions('write')
  async upsertInstance(@Body() payload: Record<string, unknown>) {
    return this.service.upsertInstance(payload);
  }
}

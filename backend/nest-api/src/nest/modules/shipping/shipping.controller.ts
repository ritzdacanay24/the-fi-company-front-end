import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { ShippingService } from './shipping.service';

@Controller('shipping')
@UseGuards(RolePermissionGuard)
export class ShippingController {
  constructor(private readonly service: ShippingService) {}

  @Get('read-open-report')
  async readOpenReport() {
    return this.service.readOpenReport();
  }

  @Post('save-misc')
  @Permissions('write')
  async saveMisc(@Body() payload: Record<string, unknown>) {
    return this.service.saveMisc(payload || {});
  }
}

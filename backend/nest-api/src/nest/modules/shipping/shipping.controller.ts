import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { ShippingService } from './shipping.service';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';

@Controller('shipping')
@UseGuards(RolePermissionGuard)
export class ShippingController {
  constructor(private readonly service: ShippingService) {}

  @Get('read-open-report')
  async readOpenReport(@CurrentUserId() currentUserId: number) {
    return this.service.readOpenReport(currentUserId);
  }

  @Post('save-misc')
  @Permissions('write')
  async saveMisc(
    @Body() payload: Record<string, unknown>,
    @CurrentUserId() currentUserId: number,
  ) {
    return this.service.saveMisc(payload || {}, currentUserId);
  }
}

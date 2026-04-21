import { Body, Controller, Get, Post } from '@nestjs/common';
import { ShippingService } from './shipping.service';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly service: ShippingService) {}

  @Get('read-open-report')
  async readOpenReport() {
    return this.service.readOpenReport();
  }

  @Post('save-misc')
  async saveMisc(@Body() payload: Record<string, unknown>) {
    return this.service.saveMisc(payload || {});
  }
}

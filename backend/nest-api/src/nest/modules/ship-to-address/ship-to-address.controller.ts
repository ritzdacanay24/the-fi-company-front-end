import { Controller, Get, Query } from '@nestjs/common';
import { ShipToAddressService } from './ship-to-address.service';

@Controller('ship-to-address')
export class ShipToAddressController {
  constructor(private readonly service: ShipToAddressService) {}

  @Get('index')
  async read(@Query('read') read?: string): Promise<Record<string, unknown> | null> {
    const addressCode = String(read || '').trim();
    if (!addressCode) {
      return null;
    }

    return this.service.read(addressCode);
  }
}

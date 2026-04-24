import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { ShipToAddressService } from './ship-to-address.service';

@Controller('ship-to-address')
@UseGuards(RolePermissionGuard)
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

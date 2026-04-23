import { Module } from '@nestjs/common';
import { ShipToAddressController } from './ship-to-address.controller';
import { ShipToAddressService } from './ship-to-address.service';

@Module({
  controllers: [ShipToAddressController],
  providers: [ShipToAddressService],
})
export class ShipToAddressModule {}

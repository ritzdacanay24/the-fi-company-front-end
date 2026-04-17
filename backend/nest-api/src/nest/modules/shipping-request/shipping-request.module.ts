import { Module } from '@nestjs/common';
import { ShippingRequestController } from './shipping-request.controller';
import { ShippingRequestService } from './shipping-request.service';
import { ShippingRequestRepository } from './shipping-request.repository';

@Module({
  controllers: [ShippingRequestController],
  providers: [ShippingRequestService, ShippingRequestRepository],
  exports: [ShippingRequestService],
})
export class ShippingRequestModule {}

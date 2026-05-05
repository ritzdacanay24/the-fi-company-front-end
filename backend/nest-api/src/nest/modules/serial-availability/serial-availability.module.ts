import { Module } from '@nestjs/common';
import { SerialAvailabilityController } from './serial-availability.controller';
import { SerialAvailabilityRepository } from './serial-availability.repository';
import { SerialAvailabilityService } from './serial-availability.service';

@Module({
  controllers: [SerialAvailabilityController],
  providers: [SerialAvailabilityService, SerialAvailabilityRepository],
  exports: [SerialAvailabilityRepository],
})
export class SerialAvailabilityModule {}

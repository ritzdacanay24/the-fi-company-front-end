import { Module } from '@nestjs/common';
import { VehicleInspectionController } from './vehicle-inspection.controller';
import { VehicleInspectionRepository } from './vehicle-inspection.repository';
import { VehicleInspectionService } from './vehicle-inspection.service';

@Module({
  controllers: [VehicleInspectionController],
  providers: [VehicleInspectionService, VehicleInspectionRepository],
  exports: [VehicleInspectionService],
})
export class VehicleInspectionModule {}

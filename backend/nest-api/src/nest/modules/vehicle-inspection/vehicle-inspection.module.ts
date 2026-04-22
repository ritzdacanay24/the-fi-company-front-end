import { Module } from '@nestjs/common';
import { VehicleInspectionController } from './vehicle-inspection.controller';
import { VehicleInspectionRepository } from './vehicle-inspection.repository';
import { VehicleInspectionService } from './vehicle-inspection.service';
import { EmailNotificationsModule } from '../email-notifications';

@Module({
  imports: [EmailNotificationsModule],
  controllers: [VehicleInspectionController],
  providers: [VehicleInspectionService, VehicleInspectionRepository],
  exports: [VehicleInspectionService],
})
export class VehicleInspectionModule {}

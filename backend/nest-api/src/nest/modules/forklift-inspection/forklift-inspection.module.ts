import { Module } from '@nestjs/common';
import { ForkliftInspectionController } from './forklift-inspection.controller';
import { ForkliftInspectionRepository } from './forklift-inspection.repository';
import { ForkliftInspectionService } from './forklift-inspection.service';
import { EmailNotificationsModule } from '../email-notifications';

@Module({
  imports: [EmailNotificationsModule],
  controllers: [ForkliftInspectionController],
  providers: [ForkliftInspectionService, ForkliftInspectionRepository],
  exports: [ForkliftInspectionService],
})
export class ForkliftInspectionModule {}

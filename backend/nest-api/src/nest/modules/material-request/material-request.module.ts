import { Module } from '@nestjs/common';
import { MaterialRequestController } from './material-request.controller';
import { MaterialRequestService } from './material-request.service';
import { MaterialRequestRepository } from './material-request.repository';
import { EmailNotificationsModule } from '../email-notifications';

@Module({
  imports: [EmailNotificationsModule],
  controllers: [MaterialRequestController],
  providers: [MaterialRequestService, MaterialRequestRepository],
  exports: [MaterialRequestService],
})
export class MaterialRequestModule {}

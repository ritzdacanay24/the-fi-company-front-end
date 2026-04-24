import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control';
import { SafetyIncidentController } from './safety-incident.controller';
import { SafetyIncidentRepository } from './safety-incident.repository';
import { SafetyIncidentService } from './safety-incident.service';
import { EmailNotificationsModule } from '../email-notifications';

@Module({
  imports: [AccessControlModule, EmailNotificationsModule],
  controllers: [SafetyIncidentController],
  providers: [SafetyIncidentService, SafetyIncidentRepository],
  exports: [SafetyIncidentService],
})
export class SafetyIncidentModule {}

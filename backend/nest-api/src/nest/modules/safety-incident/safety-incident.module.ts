import { Module } from '@nestjs/common';
import { SafetyIncidentController } from './safety-incident.controller';
import { SafetyIncidentRepository } from './safety-incident.repository';
import { SafetyIncidentService } from './safety-incident.service';

@Module({
  controllers: [SafetyIncidentController],
  providers: [SafetyIncidentService, SafetyIncidentRepository],
  exports: [SafetyIncidentService],
})
export class SafetyIncidentModule {}

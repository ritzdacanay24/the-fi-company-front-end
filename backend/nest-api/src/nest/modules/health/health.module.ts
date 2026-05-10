import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DeployStatusService } from './deploy-status.service';

@Module({
  controllers: [HealthController],
  providers: [DeployStatusService],
  exports: [DeployStatusService],
})
export class HealthModule {}

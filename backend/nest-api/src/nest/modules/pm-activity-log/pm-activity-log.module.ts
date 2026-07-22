import { Module } from '@nestjs/common';
import { PmActivityLogController } from './pm-activity-log.controller';
import { PmActivityLogService } from './pm-activity-log.service';
import { PmActivityLogRepository } from './pm-activity-log.repository';

@Module({
  controllers: [PmActivityLogController],
  providers: [PmActivityLogService, PmActivityLogRepository],
  exports: [PmActivityLogService],
})
export class PmActivityLogModule {}

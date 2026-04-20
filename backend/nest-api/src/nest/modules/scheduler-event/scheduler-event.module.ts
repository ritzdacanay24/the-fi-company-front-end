import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { SchedulerEventRepository } from './scheduler-event.repository';
import { SchedulerEventService } from './scheduler-event.service';
import { SchedulerEventController } from './scheduler-event.controller';

@Module({
  imports: [MysqlModule],
  providers: [SchedulerEventRepository, SchedulerEventService],
  controllers: [SchedulerEventController],
  exports: [SchedulerEventService, SchedulerEventRepository],
})
export class SchedulerEventModule {}

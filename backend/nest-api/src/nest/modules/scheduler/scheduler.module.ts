import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { SchedulerRepository } from './scheduler.repository';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';

@Module({
  imports: [MysqlModule],
  providers: [SchedulerRepository, SchedulerService],
  controllers: [SchedulerController],
  exports: [SchedulerService, SchedulerRepository],
})
export class SchedulerModule {}

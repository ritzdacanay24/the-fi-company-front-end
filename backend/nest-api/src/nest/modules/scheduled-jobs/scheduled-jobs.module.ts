import { Module } from '@nestjs/common';
import { EmailNotificationModule } from '../email-notification/email-notification.module';
import { GraphicsProductionModule } from '../graphics-production/graphics-production.module';
import { ScheduledJobsController } from './scheduled-jobs.controller';
import { ScheduledJobsRunnerService } from './scheduled-jobs.runner.service';
import { ScheduledJobsService } from './scheduled-jobs.service';

@Module({
  imports: [GraphicsProductionModule, EmailNotificationModule],
  controllers: [ScheduledJobsController],
  providers: [ScheduledJobsService, ScheduledJobsRunnerService],
})
export class ScheduledJobsModule {}

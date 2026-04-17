import { Module } from '@nestjs/common';
import { CronEmailNotificationsService } from './cron-email-notifications.service';

@Module({
  providers: [CronEmailNotificationsService],
  exports: [CronEmailNotificationsService],
})
export class CronEmailNotificationsModule {}

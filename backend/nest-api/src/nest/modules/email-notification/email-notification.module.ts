import { Module } from '@nestjs/common';
import { EmailNotificationController } from './email-notification.controller';
import { EmailNotificationService } from './email-notification.service';
import { EmailNotificationRepository } from './email-notification.repository';

@Module({
  controllers: [EmailNotificationController],
  providers: [EmailNotificationService, EmailNotificationRepository],
  exports: [EmailNotificationService],
})
export class EmailNotificationModule {}

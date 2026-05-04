import { Module } from '@nestjs/common';
import { QirController } from './qir.controller';
import { QirService } from './qir.service';
import { QirRepository } from './qir.repository';
import { EmailNotificationsModule } from '../email-notifications';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  imports: [EmailNotificationsModule, AttachmentsModule],
  controllers: [QirController],
  providers: [QirService, QirRepository],
  exports: [QirService],
})
export class QirModule {}

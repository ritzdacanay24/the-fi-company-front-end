import { Module } from '@nestjs/common';
import { QirController } from './qir.controller';
import { QirService } from './qir.service';
import { QirRepository } from './qir.repository';
import { EmailNotificationsModule } from '../email-notifications';

@Module({
  imports: [EmailNotificationsModule],
  controllers: [QirController],
  providers: [QirService, QirRepository],
  exports: [QirService],
})
export class QirModule {}

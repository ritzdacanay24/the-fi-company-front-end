import { Module } from '@nestjs/common';
import { NcrController } from './ncr.controller';
import { NcrService } from './ncr.service';
import { NcrRepository } from './ncr.repository';
import { EmailNotificationsModule } from '../email-notifications';

@Module({
  imports: [EmailNotificationsModule],
  controllers: [NcrController],
  providers: [NcrService, NcrRepository],
  exports: [NcrService],
})
export class NcrModule {}

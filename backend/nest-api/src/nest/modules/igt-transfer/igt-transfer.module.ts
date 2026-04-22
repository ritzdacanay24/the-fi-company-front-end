import { Module } from '@nestjs/common';
import { IgtTransferController } from './igt-transfer.controller';
import { IgtTransferService } from './igt-transfer.service';
import { EmailNotificationsModule } from '../email-notifications';

@Module({
  imports: [EmailNotificationsModule],
  controllers: [IgtTransferController],
  providers: [IgtTransferService],
})
export class IgtTransferModule {}
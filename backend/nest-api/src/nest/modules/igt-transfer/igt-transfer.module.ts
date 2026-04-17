import { Module } from '@nestjs/common';
import { IgtTransferController } from './igt-transfer.controller';
import { IgtTransferService } from './igt-transfer.service';
import { IgtTransferEmailRecipientsModule } from '../igt-transfer-email-recipients';

@Module({
  imports: [IgtTransferEmailRecipientsModule],
  controllers: [IgtTransferController],
  providers: [IgtTransferService],
})
export class IgtTransferModule {}
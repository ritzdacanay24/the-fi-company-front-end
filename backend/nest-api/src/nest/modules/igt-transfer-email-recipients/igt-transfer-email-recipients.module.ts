import { Module } from '@nestjs/common';
import { IgtTransferEmailRecipientsService } from './igt-transfer-email-recipients.service';

@Module({
  providers: [IgtTransferEmailRecipientsService],
  exports: [IgtTransferEmailRecipientsService],
})
export class IgtTransferEmailRecipientsModule {}

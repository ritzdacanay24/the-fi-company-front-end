import { Module } from '@nestjs/common';
import { IgtTransferController } from './igt-transfer.controller';
import { IgtTransferService } from './igt-transfer.service';

@Module({
  controllers: [IgtTransferController],
  providers: [IgtTransferService],
})
export class IgtTransferModule {}
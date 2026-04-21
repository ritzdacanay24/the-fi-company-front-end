import { Module } from '@nestjs/common';
import { LateReasonCodesController } from './late-reason-codes.controller';
import { LateReasonCodesService } from './late-reason-codes.service';

@Module({
  controllers: [LateReasonCodesController],
  providers: [LateReasonCodesService],
})
export class LateReasonCodesModule {}

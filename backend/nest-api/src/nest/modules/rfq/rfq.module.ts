import { Module } from '@nestjs/common';
import { RfqController } from './rfq.controller';
import { RfqService } from './rfq.service';
import { RfqRepository } from './rfq.repository';

@Module({
  controllers: [RfqController],
  providers: [RfqService, RfqRepository],
  exports: [RfqService],
})
export class RfqModule {}

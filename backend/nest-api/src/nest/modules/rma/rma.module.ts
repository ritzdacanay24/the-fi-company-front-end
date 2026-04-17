import { Module } from '@nestjs/common';
import { RmaController } from './rma.controller';
import { RmaService } from './rma.service';
import { RmaRepository } from './rma.repository';

@Module({
  controllers: [RmaController],
  providers: [RmaService, RmaRepository],
  exports: [RmaService],
})
export class RmaModule {}

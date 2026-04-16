import { Module } from '@nestjs/common';
import { NcrController } from './ncr.controller';
import { NcrService } from './ncr.service';
import { NcrRepository } from './ncr.repository';

@Module({
  controllers: [NcrController],
  providers: [NcrService, NcrRepository],
  exports: [NcrService],
})
export class NcrModule {}

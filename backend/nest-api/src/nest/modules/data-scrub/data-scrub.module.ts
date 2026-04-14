import { Module } from '@nestjs/common';
import { DataScrubController } from './data-scrub.controller';
import { DataScrubService } from './data-scrub.service';

@Module({
  controllers: [DataScrubController],
  providers: [DataScrubService],
})
export class DataScrubModule {}

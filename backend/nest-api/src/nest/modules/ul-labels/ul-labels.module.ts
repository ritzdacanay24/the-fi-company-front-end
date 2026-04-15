import { Module } from '@nestjs/common';
import { UlLabelsController } from './ul-labels.controller';
import { UlLabelsService } from './ul-labels.service';

@Module({
  controllers: [UlLabelsController],
  providers: [UlLabelsService],
})
export class UlLabelsModule {}

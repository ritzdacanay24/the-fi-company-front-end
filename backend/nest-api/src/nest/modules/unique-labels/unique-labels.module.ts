import { Module } from '@nestjs/common';
import { UniqueLabelsController } from './unique-labels.controller';
import { UniqueLabelsService } from './unique-labels.service';

@Module({
  controllers: [UniqueLabelsController],
  providers: [UniqueLabelsService],
})
export class UniqueLabelsModule {}

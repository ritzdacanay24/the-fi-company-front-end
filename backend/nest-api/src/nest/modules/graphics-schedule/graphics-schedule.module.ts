import { Module } from '@nestjs/common';
import { GraphicsScheduleController } from './graphics-schedule.controller';
import { GraphicsScheduleService } from './graphics-schedule.service';
import { GraphicsScheduleRepository } from './graphics-schedule.repository';

@Module({
  controllers: [GraphicsScheduleController],
  providers: [GraphicsScheduleService, GraphicsScheduleRepository],
  exports: [GraphicsScheduleService],
})
export class GraphicsScheduleModule {}

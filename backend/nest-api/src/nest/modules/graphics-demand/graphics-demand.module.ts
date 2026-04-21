import { Module } from '@nestjs/common';
import { GraphicsDemandController } from './graphics-demand.controller';
import { GraphicsDemandService } from './graphics-demand.service';

@Module({
  controllers: [GraphicsDemandController],
  providers: [GraphicsDemandService],
})
export class GraphicsDemandModule {}

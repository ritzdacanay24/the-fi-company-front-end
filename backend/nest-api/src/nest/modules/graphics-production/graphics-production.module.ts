import { Module } from '@nestjs/common';
import { GraphicsProductionController } from './graphics-production.controller';
import { GraphicsProductionService } from './graphics-production.service';
import { GraphicsProductionRepository } from './graphics-production.repository';

@Module({
  controllers: [GraphicsProductionController],
  providers: [GraphicsProductionService, GraphicsProductionRepository],
  exports: [GraphicsProductionService],
})
export class GraphicsProductionModule {}

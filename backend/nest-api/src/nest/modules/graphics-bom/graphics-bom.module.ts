import { Module } from '@nestjs/common';
import { GraphicsBomController } from './graphics-bom.controller';
import { GraphicsBomService } from './graphics-bom.service';
import { GraphicsBomRepository } from './graphics-bom.repository';

@Module({
  controllers: [GraphicsBomController],
  providers: [GraphicsBomService, GraphicsBomRepository],
  exports: [GraphicsBomService],
})
export class GraphicsBomModule {}

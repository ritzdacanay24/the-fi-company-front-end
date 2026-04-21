import { Module } from '@nestjs/common';
import { GraphicsBomController } from './graphics-bom.controller';
import { GraphicsBomService } from './graphics-bom.service';
import { GraphicsBomRepository } from './graphics-bom.repository';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [FileStorageModule],
  controllers: [GraphicsBomController],
  providers: [GraphicsBomService, GraphicsBomRepository],
  exports: [GraphicsBomService],
})
export class GraphicsBomModule {}

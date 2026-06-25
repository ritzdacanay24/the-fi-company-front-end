import { Module } from '@nestjs/common';
import { GraphicsProductionController } from './graphics-production.controller';
import { GraphicsProductionService } from './graphics-production.service';
import { GraphicsProductionRepository } from './graphics-production.repository';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [FileStorageModule],
  controllers: [GraphicsProductionController],
  providers: [GraphicsProductionService, GraphicsProductionRepository],
  exports: [GraphicsProductionService],
})
export class GraphicsProductionModule {}

import { Module } from '@nestjs/common';
import { BomStructureController } from './bom-structure.controller';
import { BomStructureService } from './bom-structure.service';

@Module({
  controllers: [BomStructureController],
  providers: [BomStructureService],
})
export class BomStructureModule {}

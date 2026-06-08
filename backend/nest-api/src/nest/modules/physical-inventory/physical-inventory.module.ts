import { Module } from '@nestjs/common';
import { PhysicalInventoryController } from './physical-inventory.controller';
import { PhysicalInventoryService } from './physical-inventory.service';

@Module({
  controllers: [PhysicalInventoryController],
  providers: [PhysicalInventoryService],
})
export class PhysicalInventoryModule {}

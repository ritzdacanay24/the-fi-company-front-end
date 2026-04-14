import { Module } from '@nestjs/common';
import { InventoryByProdLineController } from './inventory-by-prod-line.controller';
import { InventoryByProdLineService } from './inventory-by-prod-line.service';

@Module({
  controllers: [InventoryByProdLineController],
  providers: [InventoryByProdLineService],
})
export class InventoryByProdLineModule {}

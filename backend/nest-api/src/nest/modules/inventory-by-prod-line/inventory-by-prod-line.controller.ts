import { Controller, Get, Inject } from '@nestjs/common';
import { InventoryByProdLineService } from './inventory-by-prod-line.service';

@Controller('inventory-by-prod-line')
export class InventoryByProdLineController {
  constructor(
    @Inject(InventoryByProdLineService)
    private readonly inventoryByProdLineService: InventoryByProdLineService,
  ) {}

  @Get('pastDueOrders')
  async getPastDueOrders() {
    return this.inventoryByProdLineService.getPastDueOrders();
  }

  @Get('getSafetyStock')
  async getSafetyStock() {
    return this.inventoryByProdLineService.getSafetyStock();
  }
}

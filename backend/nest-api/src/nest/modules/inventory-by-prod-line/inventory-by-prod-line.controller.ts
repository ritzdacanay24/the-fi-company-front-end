import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { InventoryByProdLineService } from './inventory-by-prod-line.service';

@Controller('inventory-by-prod-line')
@UseGuards(RolePermissionGuard)
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

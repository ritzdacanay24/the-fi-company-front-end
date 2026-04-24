import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { GraphicsProductionService } from './graphics-production.service';

@Controller('graphics-production')
@UseGuards(RolePermissionGuard)
export class GraphicsProductionController {
  constructor(private readonly service: GraphicsProductionService) {}

  @Get()
  async getProductionOrders() {
    return this.service.getProductionOrders();
  }

  @Get('work-order-search')
  async getWorkOrderSearch(@Query('graphicsWoNumber') graphicsWoNumber?: string) {
    return this.service.getWorkOrderSearch(graphicsWoNumber);
  }
}

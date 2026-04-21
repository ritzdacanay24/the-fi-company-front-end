import { Controller, Get, Query } from '@nestjs/common';
import { GraphicsProductionService } from './graphics-production.service';

@Controller('graphics-production')
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

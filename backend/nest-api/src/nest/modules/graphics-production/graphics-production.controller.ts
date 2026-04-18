import { Controller, Get } from '@nestjs/common';
import { GraphicsProductionService } from './graphics-production.service';

@Controller('graphics-production')
export class GraphicsProductionController {
  constructor(private readonly service: GraphicsProductionService) {}

  @Get()
  async getProductionOrders() {
    return this.service.getProductionOrders();
  }
}

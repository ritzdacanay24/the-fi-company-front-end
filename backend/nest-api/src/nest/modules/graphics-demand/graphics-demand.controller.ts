import { Body, Controller, Get, Post } from '@nestjs/common';
import { GraphicsDemandService } from './graphics-demand.service';

@Controller('graphics-demand')
export class GraphicsDemandController {
  constructor(private readonly service: GraphicsDemandService) {}

  @Get('report')
  async getReport() {
    return this.service.getReport();
  }

  @Post()
  async createOrUpdate(@Body() payload: Record<string, unknown>) {
    return this.service.createOrUpdate(payload);
  }
}

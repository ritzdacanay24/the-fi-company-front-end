import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { GraphicsDemandService } from './graphics-demand.service';

@Controller('graphics-demand')
@UseGuards(RolePermissionGuard)
export class GraphicsDemandController {
  constructor(private readonly service: GraphicsDemandService) {}

  @Get('report')
  async getReport() {
    return this.service.getReport();
  }

  @Post()
  @Permissions('write')
  async createOrUpdate(@Body() payload: Record<string, unknown>) {
    return this.service.createOrUpdate(payload);
  }
}

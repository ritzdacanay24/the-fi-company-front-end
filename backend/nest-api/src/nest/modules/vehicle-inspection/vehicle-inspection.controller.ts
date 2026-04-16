import { Body, Controller, Get, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { VehicleInspectionService } from './vehicle-inspection.service';

@Controller('vehicle-inspection')
export class VehicleInspectionController {
  constructor(private readonly service: VehicleInspectionService) {}

  @Get('getList')
  async getList() {
    return this.service.getList();
  }

  @Post('create')
  async create(@Body() payload: Record<string, any>) {
    return this.service.create(payload);
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.service.searchById(id);
  }

  @Put('saveDetailById')
  async saveDetailById(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, any> = {},
  ) {
    return this.service.saveDetailById(id, payload);
  }

  @Get('getDetaliById')
  async getDetaliById(@Query('id', ParseIntPipe) id: number) {
    return this.service.getDetaliById(id);
  }
}

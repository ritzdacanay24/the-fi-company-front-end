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

  @Post('createLegacy')
  async createLegacy(@Body() payload: Record<string, any>) {
    return this.service.createLegacy(payload);
  }

  @Get('index')
  async indexGet(@Query('searchById') searchById?: string) {
    if (searchById) {
      return this.service.searchById(Number(searchById));
    }

    return {
      status: 1,
      message: 'vehicle-inspection/index is available. Use ?searchById=<id> or POST payload.',
    };
  }

  @Post('index')
  async indexPost(@Body() payload: Record<string, any>) {
    return this.service.create(payload);
  }

  @Put('index')
  async indexPut(
    @Query('id') id?: string,
    @Body() payload: Record<string, any> = {},
  ) {
    const parsedId = Number(id);
    if (id && Number.isFinite(parsedId) && parsedId > 0) {
      return this.service.saveDetailById(parsedId, payload);
    }

    if (payload?.id && Number.isFinite(Number(payload.id))) {
      return this.service.saveDetailById(Number(payload.id), payload);
    }

    return this.service.create(payload);
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.service.searchById(id);
  }

  @Get('searchByIdLegacy')
  async searchByIdLegacy(@Query('id', ParseIntPipe) id: number) {
    return this.service.searchByIdLegacy(id);
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

import { BadRequestException, Body, Controller, Get, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
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

  @Put('index')
  async indexPut(
    @Query('saveDetailById') saveDetailById?: string,
    @Body() payload: Record<string, any> = {},
  ) {
    if (saveDetailById) {
      return this.service.saveDetailById(this.parsePositiveInt(saveDetailById, 'saveDetailById'), payload);
    }

    return this.service.create(payload);
  }

  @Get('index')
  async indexGet(
    @Query('searchById') searchById?: string,
    @Query('getDetaliById') getDetaliById?: string,
  ) {
    if (searchById) {
      return this.service.searchById(this.parsePositiveInt(searchById, 'searchById'));
    }

    if (getDetaliById) {
      return this.service.getDetaliById(this.parsePositiveInt(getDetaliById, 'getDetaliById'));
    }

    throw new BadRequestException({
      code: 'RC_INVALID_QUERY',
      message: 'Expected query param searchById or getDetaliById',
    });
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.service.searchById(id);
  }

  private parsePositiveInt(value: string, queryName: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException({
        code: 'RC_INVALID_QUERY',
        message: `Invalid ${queryName} value`,
      });
    }

    return parsed;
  }
}

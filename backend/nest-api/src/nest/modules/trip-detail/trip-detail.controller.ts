import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { TripDetailService } from './trip-detail.service';

@Controller('trip-detail')
export class TripDetailController {
  constructor(private readonly service: TripDetailService) {}

  private parseNumberQuery(value: unknown, fieldName: string): number {
    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(numericValue)) {
      throw new BadRequestException(`${fieldName} must be a valid integer`);
    }
    return numericValue;
  }

  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }

  @Post()
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.update(id, payload);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }

  @Get('findByFsId')
  async findByFsId(@Query('id') id: string | number) {
    return this.service.findByFsId(this.parseNumberQuery(id, 'id'));
  }

  @Get('findByGroupFsId')
  async findByGroupFsId(@Query('id') id: string | number) {
    return this.service.findByGroupFsId(this.parseNumberQuery(id, 'id'));
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Put('emailTripDetails')
  async emailTripDetails(
    @Query('fsId') fsId: string | number,
    @Body() payload?: Record<string, unknown>,
  ) {
    return this.service.emailTripDetails(this.parseNumberQuery(fsId, 'fsId'), payload);
  }
}

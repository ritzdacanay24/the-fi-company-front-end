import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { TripDetailHeaderService } from './trip-detail-header.service';

@Controller('trip-detail-header')
export class TripDetailHeaderController {
  constructor(private readonly service: TripDetailHeaderService) {}

  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
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

  @Get('getByGroup')
  async getByGroup() {
    return this.service.getByGroup();
  }

  @Get('multipleGroups')
  async multipleGroups(@Query('id', ParseIntPipe) id: number) {
    return this.service.multipleGroups(id);
  }
}

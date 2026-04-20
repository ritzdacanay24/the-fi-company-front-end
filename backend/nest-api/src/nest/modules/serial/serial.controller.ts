import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { SerialService } from './serial.service';

@Controller('serial')
export class SerialController {
  constructor(private readonly service: SerialService) {}

  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Get('find')
  async find(@Query() params: Record<string, unknown>) {
    return this.service.find(params);
  }

  @Get('getByWorkOrderId')
  async getByWorkOrderId(@Query('workOrderId', ParseIntPipe) workOrderId: number) {
    return this.service.getByWorkOrderId(workOrderId);
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
}

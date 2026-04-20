import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { CrashKitService } from './crash-kit.service';

@Controller('crash-kit')
export class CrashKitController {
  constructor(private readonly service: CrashKitService) {}

  @Get('partSearch')
  async partSearch(@Query('partNumber') partNumber?: string) {
    return this.service.partSearch(partNumber);
  }

  @Get('byWorkOrderId')
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

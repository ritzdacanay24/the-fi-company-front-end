import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ForkliftInspectionService } from './forklift-inspection.service';

@Controller('forklift-inspection')
export class ForkliftInspectionController {
  constructor(private readonly service: ForkliftInspectionService) {}

  @Get('getList')
  async getList() {
    return this.service.getList();
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post('create')
  async create(@Body() payload: Record<string, any>) {
    return this.service.create(payload);
  }

  @Put('updateById')
  async updateById(@Query('id', ParseIntPipe) id: number, @Body() payload: Record<string, any>) {
    return this.service.updateById(id, payload);
  }

  @Delete('deleteById')
  async deleteById(@Query('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }

  @Put('updateById/:id')
  async updateByIdPath(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, any>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Delete('deleteById/:id')
  async deleteByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }
}

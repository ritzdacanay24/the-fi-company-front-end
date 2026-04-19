import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { TableSettingsService } from './table-settings.service';

@Controller(['table-settings', 'Api/tableSettings'])
export class TableSettingsController {
  constructor(private readonly service: TableSettingsService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Get('find')
  find(@Query() query: Record<string, any>) {
    return this.service.find(query);
  }

  @Get('find-one')
  findOne(@Query() query: Record<string, any>) {
    return this.service.findOne(query);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, any>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}

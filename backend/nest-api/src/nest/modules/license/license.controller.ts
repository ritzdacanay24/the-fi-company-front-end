import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { LicenseService } from './license.service';

@Controller('license')
export class LicenseController {
  constructor(private readonly service: LicenseService) {}

  @Get()
  async getAll(@Query('selectedViewType') selectedViewType?: string) {
    return this.service.getAll(selectedViewType);
  }

  @Get('find')
  async find() {
    return this.service.find();
  }

  @Get('searchLicense')
  async searchLicense(@Query('text') text = '') {
    return this.service.searchLicense(text);
  }

  @Get('getByIdAndTechs')
  async getByIdAndTechs(@Query('id', ParseIntPipe) id: number) {
    return this.service.getByIdAndTechs(id);
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

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { MaterialRequestDetailService } from './material-request-detail.service';

@Controller('material-request-detail')
export class MaterialRequestDetailController {
  constructor(private readonly service: MaterialRequestDetailService) {}

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }

  @Get('getAll')
  async getAll() {
    return this.service.getAll();
  }

  @Get('getById')
  async getByIdQuery(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Get('getById/:id')
  async getByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post('create')
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put('updateById')
  async updateByIdQuery(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Put('updateById/:id')
  async updateByIdPath(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Delete('deleteById')
  async deleteByIdQuery(@Query('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }

  @Delete('deleteById/:id')
  async deleteByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }
}

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { QirService } from './qir.service';

@Controller('qir')
export class QirController {
  constructor(private readonly service: QirService) {}

  @Get('getList')
  async getList(
    @Query('selectedViewType') selectedViewType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('isAll') isAll?: string,
  ) {
    return this.service.getList({
      selectedViewType,
      dateFrom,
      dateTo,
      isAll: isAll === '1' || isAll === 'true',
    });
  }

  @Get('searchQir')
  async searchQir(@Query('text') text?: string) {
    return this.service.searchQir(text || '');
  }

  @Get('find')
  async find(@Query() query: Record<string, string>) {
    return this.service.find(query);
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Get('getQirById')
  async getQirById(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post('create')
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put('updateById/:id')
  async updateByIdPath(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Put('updateById')
  async updateByIdQuery(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Delete('deleteById/:id')
  async deleteByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }

  @Delete('deleteById')
  async deleteByIdQuery(@Query('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }
}

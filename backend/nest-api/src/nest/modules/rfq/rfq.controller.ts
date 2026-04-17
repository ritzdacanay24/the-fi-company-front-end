import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { RfqService } from './rfq.service';

@Controller('rfq')
export class RfqController {
  constructor(private readonly service: RfqService) {}

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

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }

  @Get('getAll')
  async getAll(@Query('selectedViewType') selectedViewType?: string) {
    return this.service.getAll(selectedViewType);
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

  @Get('read')
  async read(@Query('so') so?: string, @Query('line') line?: string) {
    return this.service.searchBySoAndSoLine(so || '', line || '');
  }

  @Post('send_email')
  async sendEmail(@Query('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.sendEmail(id, payload);
  }
}

import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { JobService } from './job.service';

@Controller('job')
export class JobController {
  constructor(private readonly service: JobService) {}

  @Get('getAll')
  async getAll(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('selectedViewType') selectedViewType?: string,
    @Query('isAll') isAll?: string,
  ) {
    return this.service.getAll(dateFrom, dateTo, selectedViewType, isAll);
  }

  @Get('getOpenInvoice')
  async getOpenInvoice(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('isAll') isAll?: string,
  ) {
    return this.service.getOpenInvoice(dateFrom, dateTo, isAll);
  }

  @Get('findOne')
  async findOne(@Query() params: Record<string, unknown>) {
    return this.service.findOne(params);
  }

  @Post()
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.update(id, payload);
  }

  @Put('updateInvoice/:id')
  async updateInvoice(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.updateInvoice(id, payload);
  }
}

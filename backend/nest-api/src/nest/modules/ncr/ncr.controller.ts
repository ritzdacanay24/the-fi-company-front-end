import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { NcrService } from './ncr.service';

@Controller('ncr')
export class NcrController {
  constructor(private readonly service: NcrService) {}

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

  @Get('getOpenSummary')
  async getOpenSummary() {
    return this.service.getOpenSummary();
  }

  @Get('getchart')
  async getchart() {
    return this.service.getChart();
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
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

  @Put('updateAndSendEmailToDepartment')
  async updateAndSendEmailToDepartment(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateAndSendEmailToDepartment(id, payload);
  }

  @Get('complaint-codes/getAll')
  async getComplaintCodes() {
    return this.service.getComplaintCodes();
  }
}

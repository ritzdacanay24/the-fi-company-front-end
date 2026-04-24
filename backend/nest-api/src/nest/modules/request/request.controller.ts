import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { RequestService } from './request.service';

@Controller('request')
@UseGuards(RolePermissionGuard)
export class RequestController {
  constructor(private readonly service: RequestService) {}

  @Get()
  async getAll(@Query('selectedViewType') selectedViewType?: string) {
    return this.service.getAllRequests(selectedViewType);
  }

  @Get('getAllRequests')
  async getAllRequests(@Query('selectedViewType') selectedViewType?: string) {
    return this.service.getAllRequests(selectedViewType);
  }

  @Get('getChart')
  async getChart(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('displayCustomers') displayCustomers?: string,
    @Query('typeOfView') typeOfView?: string,
  ) {
    return this.service.getChart(dateFrom, dateTo, displayCustomers, typeOfView);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  @Permissions('write')
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put(':id')
  @Permissions('write')
  async update(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.update(id, payload);
  }
}

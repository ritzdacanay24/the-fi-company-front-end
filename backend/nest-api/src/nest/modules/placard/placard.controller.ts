import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { PlacardService } from './placard.service';

@Controller('placard')
@UseGuards(RolePermissionGuard)
export class PlacardController {
  constructor(private readonly service: PlacardService) {}

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
  async getAll() {
    return this.service.getAll();
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Get('getPlacardBySoSearch')
  async getPlacardBySoSearch(
    @Query('order') order?: string,
    @Query('partNumber') partNumber?: string,
    @Query('line') line?: string,
  ) {
    return this.service.getPlacardBySoSearch(order || '', partNumber || '', line || '');
  }

  @Get('searchSerialNumber')
  async searchSerialNumber(@Query('serialNumber') serialNumber?: string) {
    return this.service.searchSerialNumber(serialNumber || '');
  }

  @Get('validateWo')
  async validateWo(@Query('validateWo') validateWo?: string, @Query('woNumber') woNumber?: string) {
    return this.service.validateWo(validateWo || woNumber || '');
  }

  @Post('create')
  @Permissions('write')
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put('updateById')
  @Permissions('write')
  async updateByIdQuery(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Put('updateById/:id')
  @Permissions('write')
  async updateByIdPath(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Delete('deleteById')
  @Permissions('delete')
  async deleteByIdQuery(@Query('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }

  @Delete('deleteById/:id')
  @Permissions('delete')
  async deleteByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }
}

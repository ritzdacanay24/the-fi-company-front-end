import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { ShortagesService } from './shortages.service';

@Controller('shortages')
@UseGuards(RolePermissionGuard)
export class ShortagesController {
  constructor(private readonly service: ShortagesService) {}

  @Get('getList')
  async getList(
    @Query('active') active?: string,
    @Query('queue') queue?: string,
  ) {
    return this.service.getList({
      active: active !== undefined ? Number(active) : undefined,
      queue,
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
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post('create')
  @Permissions('write')
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Post('createShortages')
  @Permissions('write')
  async createShortages(@Body() payload: { data?: Array<Record<string, unknown>> }) {
    return this.service.createShortages(payload?.data || []);
  }

  @Post('update')
  @Permissions('write')
  async updateByPayload(@Body() payload: Record<string, unknown>) {
    return this.service.updateByPayload(payload);
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

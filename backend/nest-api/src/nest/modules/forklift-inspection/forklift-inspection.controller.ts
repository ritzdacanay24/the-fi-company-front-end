import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { ForkliftInspectionService } from './forklift-inspection.service';

@Controller('forklift-inspection')
@UseGuards(RolePermissionGuard)
export class ForkliftInspectionController {
  constructor(private readonly service: ForkliftInspectionService) {}

  @Get('getList')
  async getList() {
    return this.service.getList();
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post('create')
  @Permissions('write')
  async create(@Body() payload: Record<string, any>) {
    return this.service.create(payload);
  }

  @Post('createLegacy')
  @Permissions('write')
  async createLegacy(@Body() payload: Record<string, any>) {
    return this.service.createLegacy(payload);
  }

  @Get('index')
  async indexGet() {
    return {
      status: 1,
      message: 'forklift-inspection/index is available. Use POST to submit payload.',
    };
  }

  @Post('index')
  @Permissions('write')
  async indexPost(@Body() payload: Record<string, any>) {
    return this.service.create(payload);
  }

  @Put('index')
  @Permissions('write')
  async indexPut(
    @Query('id') id?: string,
    @Body() payload: Record<string, any> = {},
  ) {
    const parsedId = Number(id);
    if (id && Number.isFinite(parsedId) && parsedId > 0) {
      return this.service.updateById(parsedId, payload);
    }

    return this.service.create(payload);
  }

  @Put('updateById')
  @Permissions('write')
  async updateById(@Query('id', ParseIntPipe) id: number, @Body() payload: Record<string, any>) {
    return this.service.updateById(id, payload);
  }

  @Delete('deleteById')
  @Permissions('delete')
  async deleteById(@Query('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }

  @Put('updateById/:id')
  @Permissions('write')
  async updateByIdPath(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, any>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Delete('deleteById/:id')
  @Permissions('delete')
  async deleteByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }
}

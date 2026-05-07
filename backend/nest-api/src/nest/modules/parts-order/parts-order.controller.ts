import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { PartsOrderService } from './parts-order.service';

@Controller('parts-order')
@UseGuards(RolePermissionGuard)
export class PartsOrderController {
  constructor(private readonly service: PartsOrderService) {}

  @Get()
  async getAll(@Query('view') view?: string) {
    return this.service.getAll(view);
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }

  @Get('getBySoLineNumber')
  async getBySoLineNumber(@Query('so_number') soNumber: string) {
    return this.service.getBySoLineNumber(soNumber);
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

  @Put('updateAndSendEmail/:id')
  @Permissions('write')
  async updateAndSendEmail(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.updateAndSendEmail(id, payload);
  }

  @Delete(':id')
  @Permissions('delete')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }

  @Patch(':id/archive')
  @Permissions('manage')
  async archive(@Param('id', ParseIntPipe) id: number) {
    return this.service.archive(id);
  }
}

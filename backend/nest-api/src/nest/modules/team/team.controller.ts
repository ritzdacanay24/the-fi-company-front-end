import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { TeamService } from './team.service';

@Controller('team')
export class TeamController {
  constructor(private readonly service: TeamService) {}

  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }

  @Get('byFsId')
  async getByFsId(@Query('fs_det_id', ParseIntPipe) fsDetId: number) {
    return this.service.getByFsId(fsDetId);
  }

  @Get('byWorkOrderId')
  async getByWorkOrderId(@Query('workOrderId', ParseIntPipe) workOrderId: number) {
    return this.service.getByWorkOrderId(workOrderId);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>) {
    return this.service.update(id, payload);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}

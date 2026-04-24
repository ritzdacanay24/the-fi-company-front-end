import { Body, Controller, Get, ParseIntPipe, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { GraphicsScheduleService } from './graphics-schedule.service';

@Controller('graphics-schedule')
@UseGuards(RolePermissionGuard)
export class GraphicsScheduleController {
  constructor(private readonly service: GraphicsScheduleService) {}

  @Get()
  async getList() {
    return this.service.getList();
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Put('updateById')
  @Permissions('write')
  async updateById(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }
}

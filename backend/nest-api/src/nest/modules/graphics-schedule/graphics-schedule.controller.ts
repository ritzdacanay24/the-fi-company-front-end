import { Body, Controller, Get, ParseIntPipe, Put, Query } from '@nestjs/common';
import { GraphicsScheduleService } from './graphics-schedule.service';

@Controller('graphics-schedule')
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
  async updateById(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }
}

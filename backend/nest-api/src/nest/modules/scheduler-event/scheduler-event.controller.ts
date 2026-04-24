import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { SchedulerEventService } from './scheduler-event.service';
import { SchedulerEventRecord } from './scheduler-event.repository';

@Controller('scheduler-event')
@UseGuards(RolePermissionGuard)
export class SchedulerEventController {
  constructor(private readonly schedulerEventService: SchedulerEventService) {}

  @Get()
  async getAll(): Promise<SchedulerEventRecord[]> {
    return this.schedulerEventService.getAll();
  }

  @Get('find')
  async find(@Query() params: Record<string, unknown>): Promise<SchedulerEventRecord[]> {
    return this.schedulerEventService.find(params);
  }

  @Get('getAllRequests')
  async getAllRequests(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<SchedulerEventRecord[]> {
    return this.schedulerEventService.getAllRequests(dateFrom, dateTo);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<SchedulerEventRecord | null> {
    return this.schedulerEventService.findOne(id);
  }

  @Post()
  @Permissions('write')
  async create(@Body() payload: Record<string, unknown>): Promise<SchedulerEventRecord | null> {
    return this.schedulerEventService.create(payload);
  }

  @Put(':id')
  @Permissions('write')
  async update(@Param('id', ParseIntPipe) id: number, @Body() payload: Record<string, unknown>): Promise<SchedulerEventRecord | null> {
    return this.schedulerEventService.update(id, payload);
  }

  @Delete(':id')
  @Permissions('delete')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<boolean> {
    return this.schedulerEventService.delete(id);
  }
}

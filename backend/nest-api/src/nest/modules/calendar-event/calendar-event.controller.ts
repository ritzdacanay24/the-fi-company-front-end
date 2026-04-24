import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { CalendarEventService } from './calendar-event.service';
import { CalendarEventRecord } from './calendar-event.repository';

@Controller('calendar-event')
@UseGuards(RolePermissionGuard)
export class CalendarEventController {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  @Get()
  async getAll(): Promise<CalendarEventRecord[]> {
    return this.calendarEventService.getAll();
  }

  @Get('find')
  async find(@Query() params: Record<string, unknown>): Promise<CalendarEventRecord[]> {
    return this.calendarEventService.find(params);
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<CalendarEventRecord | null> {
    return this.calendarEventService.findOne(id);
  }

  @Post()
  @Permissions('write')
  async create(@Body() payload: Record<string, unknown>): Promise<CalendarEventRecord | null> {
    return this.calendarEventService.create(payload);
  }

  @Put(':id')
  @Permissions('write')
  async update(@Param('id') id: number, @Body() payload: Record<string, unknown>): Promise<CalendarEventRecord | null> {
    return this.calendarEventService.update(id, payload);
  }

  @Delete(':id')
  @Permissions('delete')
  async delete(@Param('id') id: number): Promise<boolean> {
    return this.calendarEventService.delete(id);
  }
}

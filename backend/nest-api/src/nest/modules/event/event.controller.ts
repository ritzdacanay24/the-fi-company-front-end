import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { EventService } from './event.service';
import { EventRecord } from './event.repository';

@Controller('event')
@UseGuards(RolePermissionGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  async getAll(): Promise<EventRecord[]> {
    return this.eventService.getAll();
  }

  @Get('find')
  async find(@Query() params: Record<string, unknown>): Promise<EventRecord[]> {
    return this.eventService.find(params);
  }

  @Get('getEventViewByWorkOrderId')
  async getEventViewByWorkOrderId(@Query('workOrderId') workOrderIdRaw?: string) {
    const workOrderId = Number(workOrderIdRaw);
    if (!Number.isFinite(workOrderId)) {
      return [];
    }

    return this.eventService.getEventViewByWorkOrderId(workOrderId);
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<EventRecord | null> {
    return this.eventService.findOne(id);
  }

  @Post()
  @Permissions('write')
  async create(@Body() payload: Record<string, unknown>): Promise<EventRecord | null> {
    return this.eventService.create(payload);
  }

  @Put(':id')
  @Permissions('write')
  async update(@Param('id') id: number, @Body() payload: Record<string, unknown>): Promise<EventRecord | null> {
    return this.eventService.update(id, payload);
  }

  @Delete(':id')
  @Permissions('delete')
  async delete(@Param('id') id: number): Promise<boolean> {
    return this.eventService.delete(id);
  }
}

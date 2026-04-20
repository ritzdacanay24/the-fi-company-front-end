import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseIntPipe } from '@nestjs/common';
import { TicketEventService } from './ticket-event.service';
import { TicketEventRecord } from './ticket-event.repository';

@Controller('ticket-event')
export class TicketEventController {
  constructor(private readonly ticketEventService: TicketEventService) {}

  @Get()
  async getAll(@Query('selectedViewType') selectedViewType?: string): Promise<TicketEventRecord[]> {
    if (selectedViewType === 'Active') {
      return this.ticketEventService.getActive();
    } else if (selectedViewType === 'Inactive') {
      return this.ticketEventService.getInactive();
    }
    return this.ticketEventService.getAll();
  }

  @Get('find')
  async find(@Query() params: Record<string, unknown>): Promise<TicketEventRecord[]> {
    return this.ticketEventService.find(params);
  }

  @Get('find.php')
  async findPhp(@Query() params: Record<string, unknown>): Promise<TicketEventRecord[]> {
    return this.ticketEventService.find(params);
  }

  @Get('active')
  async getActive(): Promise<TicketEventRecord[]> {
    return this.ticketEventService.getActive();
  }

  @Get('inactive')
  async getInactive(): Promise<TicketEventRecord[]> {
    return this.ticketEventService.getInactive();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<TicketEventRecord | null> {
    return this.ticketEventService.findOne(id);
  }

  @Post()
  async create(@Body() payload: Record<string, unknown>): Promise<TicketEventRecord | null> {
    return this.ticketEventService.create(payload);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ): Promise<TicketEventRecord | null> {
    return this.ticketEventService.update(id, payload);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<boolean> {
    return this.ticketEventService.delete(id);
  }
}

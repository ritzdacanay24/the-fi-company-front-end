import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { KanbanPrioritiesService } from './kanban-priorities.service';

@Controller('kanban-priorities')
export class KanbanPrioritiesController {
  constructor(private readonly service: KanbanPrioritiesService) {}

  @Get()
  async getAll(@Query('order_id') orderId?: string) {
    return this.service.getPriorities(orderId);
  }

  @Post()
  async postAction(
    @Query('action') action?: string,
    @Body() payload: Record<string, unknown> = {},
  ) {
    const normalizedAction = String(action || '').trim();

    if (normalizedAction === 'apply_change') {
      return this.service.applyChange(payload);
    }

    if (normalizedAction === 'reorder') {
      return this.service.reorder(payload);
    }

    throw new BadRequestException('Unknown action. Use ?action=apply_change or ?action=reorder');
  }
}

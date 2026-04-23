import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ShippingPrioritiesService } from './shipping-priorities.service';

@Controller('shipping-priorities')
export class ShippingPrioritiesController {
  constructor(private readonly service: ShippingPrioritiesService) {}

  @Get()
  async getAll(@Query('order_id') orderId?: string) {
    return this.service.getActivePriorities(orderId);
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

    throw new BadRequestException('Unsupported action. Use action=apply_change or action=reorder');
  }
}
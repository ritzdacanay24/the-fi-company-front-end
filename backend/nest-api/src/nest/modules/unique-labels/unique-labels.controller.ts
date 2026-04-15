import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { UniqueLabelsService } from './unique-labels.service';

@Controller('unique-labels')
export class UniqueLabelsController {
  constructor(
    @Inject(UniqueLabelsService)
    private readonly uniqueLabelsService: UniqueLabelsService,
  ) {}

  @Get('work-orders/:woNumber')
  async lookupWorkOrder(@Param('woNumber') woNumber: string) {
    return this.uniqueLabelsService.lookupWorkOrder(woNumber);
  }

  @Post('batches')
  async createBatch(@Body() body: Record<string, unknown>) {
    return this.uniqueLabelsService.createBatch(body);
  }

  @Get('batches')
  async getRecentBatches(@Query('limit') limitRaw?: string) {
    return this.uniqueLabelsService.getRecentBatches(limitRaw);
  }
}

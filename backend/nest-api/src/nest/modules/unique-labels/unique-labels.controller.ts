import { Body, Controller, Get, Inject, Param, Post, Put, Query } from '@nestjs/common';
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
  async getRecentBatches(@Query('limit') limitRaw?: string, @Query('status') status?: string) {
    return this.uniqueLabelsService.getRecentBatches(limitRaw, status);
  }

  @Put('batches/:id')
  async updateBatch(@Param('id') idRaw?: string, @Body() body: Record<string, unknown> = {}) {
    return this.uniqueLabelsService.updateBatch(idRaw, body);
  }

  @Get('batches/:id')
  async getBatchDetails(@Param('id') idRaw?: string) {
    return this.uniqueLabelsService.getBatchDetails(idRaw);
  }

  @Get('reports/summary')
  async getReportSummary(@Query('days') daysRaw?: string) {
    return this.uniqueLabelsService.getReportSummary(daysRaw);
  }

  @Get('settings')
  async getSettings() {
    return this.uniqueLabelsService.getSettings();
  }

  @Put('settings')
  async updateSettings(@Body() body: Record<string, unknown>) {
    return this.uniqueLabelsService.updateSettings(body);
  }

  @Post('batches/:id/archive')
  async archiveBatch(@Param('id') idRaw?: string, @Body() body: Record<string, unknown> = {}) {
    return this.uniqueLabelsService.archiveBatch(idRaw, body);
  }

  @Post('batches/:id/soft-delete')
  async softDeleteBatch(@Param('id') idRaw?: string, @Body() body: Record<string, unknown> = {}) {
    return this.uniqueLabelsService.softDeleteBatch(idRaw, body);
  }

  @Post('batches/:id/restore')
  async restoreBatch(@Param('id') idRaw?: string, @Body() body: Record<string, unknown> = {}) {
    return this.uniqueLabelsService.restoreBatch(idRaw, body);
  }

  @Post('batches/:id/hard-delete')
  async hardDeleteBatch(@Param('id') idRaw?: string, @Body() body: Record<string, unknown> = {}) {
    return this.uniqueLabelsService.hardDeleteBatch(idRaw, body);
  }
}

import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { RolePermissionGuard } from '../access-control';
import { SerialAvailabilityService } from './serial-availability.service';

@Controller('serial-availability')
@UseGuards(RolePermissionGuard)
export class SerialAvailabilityController {
  constructor(private readonly serialAvailabilityService: SerialAvailabilityService) {}

  @Get('thresholds')
  async thresholds() {
    return this.serialAvailabilityService.getSerialStockThresholds();
  }

  @Put('thresholds')
  async updateThresholds(
    @Body() payload: Partial<Record<'eyefi' | 'ul_new' | 'ul_used' | 'igt', number>>,
    @CurrentUserId() userId: number,
  ) {
    const actor = String(userId);
    return this.serialAvailabilityService.updateSerialStockThresholds(payload, actor);
  }

  @Get('summary')
  async summary() {
    return this.serialAvailabilityService.getSummary();
  }

  @Get('available/eyefi-serials')
  async availableEyefi(@Query('limit') limit?: string) {
    return this.serialAvailabilityService.getAvailableEyefiSerials(limit ? Number(limit) : undefined);
  }

  @Get('available/ul-labels')
  async availableUlLabels(@Query('limit') limit?: string) {
    return this.serialAvailabilityService.getAvailableUlLabels(limit ? Number(limit) : undefined);
  }

  @Get('available/igt-serials')
  async availableIgt(@Query('limit') limit?: string) {
    return this.serialAvailabilityService.getAvailableIgtSerials(limit ? Number(limit) : undefined);
  }

  @Get('recently-used/eyefi-serials')
  async recentEyefi(@Query('limit') limit?: string) {
    return this.serialAvailabilityService.getRecentlyUsedEyefiSerials(limit ? Number(limit) : undefined);
  }

  @Get('recently-used/igt-serials')
  async recentIgt(@Query('limit') limit?: string) {
    return this.serialAvailabilityService.getRecentlyUsedIgtSerials(limit ? Number(limit) : undefined);
  }
}

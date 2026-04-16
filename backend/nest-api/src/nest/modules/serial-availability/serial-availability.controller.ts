import { Controller, Get, Query } from '@nestjs/common';
import { SerialAvailabilityService } from './serial-availability.service';

@Controller('serial-availability')
export class SerialAvailabilityController {
  constructor(private readonly serialAvailabilityService: SerialAvailabilityService) {}

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

  @Get('recently-used/ul-labels')
  async recentUlLabels(@Query('limit') limit?: string) {
    return this.serialAvailabilityService.getRecentlyUsedUlLabels(limit ? Number(limit) : undefined);
  }

  @Get('recently-used/igt-serials')
  async recentIgt(@Query('limit') limit?: string) {
    return this.serialAvailabilityService.getRecentlyUsedIgtSerials(limit ? Number(limit) : undefined);
  }
}

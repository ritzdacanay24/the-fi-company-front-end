import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { DataScrubService } from './data-scrub.service';

@Controller('data-scrub')
@UseGuards(RolePermissionGuard)
export class DataScrubController {
  constructor(
    @Inject(DataScrubService)
    private readonly dataScrubService: DataScrubService,
  ) {}

  @Get('negative-locations')
  async getNegativeLocations() {
    return this.dataScrubService.getByType('Negative Locations');
  }

  @Get('empty-locations')
  async getEmptyLocations() {
    return this.dataScrubService.getByType('Locations with 0 items');
  }
}

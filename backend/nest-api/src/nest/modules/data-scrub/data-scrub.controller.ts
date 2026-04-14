import { Controller, Get, Inject } from '@nestjs/common';
import { DataScrubService } from './data-scrub.service';

@Controller('data-scrub')
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

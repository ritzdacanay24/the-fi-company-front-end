import { Controller, Get, Query } from '@nestjs/common';
import { GeoLocationTrackerService } from './geo-location-tracker.service';

@Controller('geo-location-tracker')
export class GeoLocationTrackerController {
  constructor(private readonly service: GeoLocationTrackerService) {}

  @Get('getGeoLocationTracker')
  async getGeoLocationTracker(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.service.getGeoLocationTracker(dateFrom, dateTo);
  }
}

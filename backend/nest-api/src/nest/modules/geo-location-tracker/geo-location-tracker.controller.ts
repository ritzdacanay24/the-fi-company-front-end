import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { GeoLocationTrackerService } from './geo-location-tracker.service';

@Controller('geo-location-tracker')
@UseGuards(RolePermissionGuard)
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

import { Injectable } from '@nestjs/common';
import { GeoLocationTrackerRepository } from './geo-location-tracker.repository';

@Injectable()
export class GeoLocationTrackerService {
  constructor(private readonly repository: GeoLocationTrackerRepository) {}

  async getGeoLocationTracker(dateFrom: string, dateTo: string) {
    return this.repository.getGeoLocationTracker(dateFrom, dateTo);
  }
}

import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { GeoLocationTrackerController } from './geo-location-tracker.controller';
import { GeoLocationTrackerService } from './geo-location-tracker.service';
import { GeoLocationTrackerRepository } from './geo-location-tracker.repository';

@Module({
  imports: [MysqlModule],
  controllers: [GeoLocationTrackerController],
  providers: [GeoLocationTrackerService, GeoLocationTrackerRepository],
  exports: [GeoLocationTrackerService],
})
export class GeoLocationTrackerModule {}

import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { TripDetailHeaderController } from './trip-detail-header.controller';
import { TripDetailHeaderService } from './trip-detail-header.service';
import { TripDetailHeaderRepository } from './trip-detail-header.repository';

@Module({
  imports: [MysqlModule],
  controllers: [TripDetailHeaderController],
  providers: [TripDetailHeaderService, TripDetailHeaderRepository],
  exports: [TripDetailHeaderService],
})
export class TripDetailHeaderModule {}

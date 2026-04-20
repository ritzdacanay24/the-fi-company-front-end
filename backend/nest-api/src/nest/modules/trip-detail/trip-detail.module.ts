import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { EmailModule } from '@/shared/email/email.module';
import { TripDetailController } from './trip-detail.controller';
import { TripDetailService } from './trip-detail.service';
import { TripDetailRepository } from './trip-detail.repository';

@Module({
  imports: [MysqlModule, EmailModule],
  controllers: [TripDetailController],
  providers: [TripDetailService, TripDetailRepository],
  exports: [TripDetailService],
})
export class TripDetailModule {}

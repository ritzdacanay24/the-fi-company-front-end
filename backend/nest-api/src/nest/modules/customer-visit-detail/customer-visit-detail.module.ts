import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { CustomerVisitDetailController } from './customer-visit-detail.controller';
import { CustomerVisitDetailService } from './customer-visit-detail.service';
import { CustomerVisitDetailRepository } from './customer-visit-detail.repository';

@Module({
  imports: [MysqlModule],
  controllers: [CustomerVisitDetailController],
  providers: [CustomerVisitDetailService, CustomerVisitDetailRepository],
  exports: [CustomerVisitDetailService],
})
export class CustomerVisitDetailModule {}

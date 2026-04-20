import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { CustomerVisitController } from './customer-visit.controller';
import { CustomerVisitService } from './customer-visit.service';
import { CustomerVisitRepository } from './customer-visit.repository';

@Module({
  imports: [MysqlModule],
  controllers: [CustomerVisitController],
  providers: [CustomerVisitService, CustomerVisitRepository],
  exports: [CustomerVisitService],
})
export class CustomerVisitModule {}

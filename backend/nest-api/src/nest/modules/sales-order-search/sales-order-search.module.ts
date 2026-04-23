import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { SalesOrderSearchController } from './sales-order-search.controller';
import { SalesOrderSearchService } from './sales-order-search.service';

@Module({
  imports: [MysqlModule],
  controllers: [SalesOrderSearchController],
  providers: [SalesOrderSearchService],
  exports: [SalesOrderSearchService],
})
export class SalesOrderSearchModule {}
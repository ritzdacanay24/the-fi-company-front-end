import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { TripExpenseTransactionsController } from './trip-expense-transactions.controller';
import { TripExpenseTransactionsService } from './trip-expense-transactions.service';
import { TripExpenseTransactionsRepository } from './trip-expense-transactions.repository';

@Module({
  imports: [MysqlModule],
  controllers: [TripExpenseTransactionsController],
  providers: [TripExpenseTransactionsService, TripExpenseTransactionsRepository],
  exports: [TripExpenseTransactionsService],
})
export class TripExpenseTransactionsModule {}

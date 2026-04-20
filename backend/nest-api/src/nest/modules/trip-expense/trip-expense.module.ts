import { Module } from '@nestjs/common';
import { TripExpenseController } from './trip-expense.controller';
import { TripExpenseService } from './trip-expense.service';
import { TripExpenseRepository } from './trip-expense.repository';

@Module({
  controllers: [TripExpenseController],
  providers: [TripExpenseService, TripExpenseRepository],
  exports: [TripExpenseService],
})
export class TripExpenseModule {}

import { Module } from '@nestjs/common';
import { TripExpenseController } from './trip-expense.controller';
import { TripExpenseService } from './trip-expense.service';
import { TripExpenseRepository } from './trip-expense.repository';
import { FileStorageModule } from '@/nest/modules/file-storage/file-storage.module';

@Module({
  imports: [FileStorageModule],
  controllers: [TripExpenseController],
  providers: [TripExpenseService, TripExpenseRepository],
  exports: [TripExpenseService],
})
export class TripExpenseModule {}

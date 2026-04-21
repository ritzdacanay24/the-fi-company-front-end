import { Module } from '@nestjs/common';
import { UserTransactionsRepository } from './user-transactions.repository';
import { UserTransactionsService } from './user-transactions.service';

@Module({
  providers: [UserTransactionsRepository, UserTransactionsService],
  exports: [UserTransactionsService],
})
export class UserTransactionsModule {}

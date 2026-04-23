import { Module } from '@nestjs/common';
import { UserTransactionsController } from './user-transactions.controller';
import { UserTransactionsRepository } from './user-transactions.repository';
import { UserTransactionsService } from './user-transactions.service';

@Module({
  controllers: [UserTransactionsController],
  providers: [UserTransactionsRepository, UserTransactionsService],
  exports: [UserTransactionsService],
})
export class UserTransactionsModule {}

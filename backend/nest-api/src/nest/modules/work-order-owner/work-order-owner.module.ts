import { Module } from '@nestjs/common';
import { WorkOrderOwnerRepository } from './work-order-owner.repository';
import { WorkOrderOwnerService } from './work-order-owner.service';
import { UserTransactionsModule } from '../user-transactions/user-transactions.module';

@Module({
  imports: [UserTransactionsModule],
  providers: [WorkOrderOwnerRepository, WorkOrderOwnerService],
  exports: [WorkOrderOwnerService],
})
export class WorkOrderOwnerModule {}

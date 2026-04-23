import { Module } from '@nestjs/common';
import { WorkOrderOwnerController } from './work-order-owner.controller';
import { WorkOrderOwnerRepository } from './work-order-owner.repository';
import { WorkOrderOwnerService } from './work-order-owner.service';
import { UserTransactionsModule } from '../user-transactions/user-transactions.module';

@Module({
  imports: [UserTransactionsModule],
  controllers: [WorkOrderOwnerController],
  providers: [WorkOrderOwnerRepository, WorkOrderOwnerService],
  exports: [WorkOrderOwnerService],
})
export class WorkOrderOwnerModule {}

import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { UserTransactionsModule } from '../user-transactions/user-transactions.module';
import { WorkOrderOwnerModule } from '../work-order-owner/work-order-owner.module';
import { CommentsModule } from '../comments/comments.module';
import { NotesModule } from '../notes/notes.module';
import { OwnersModule } from '../owners/owners.module';

@Module({
  imports: [UserTransactionsModule, WorkOrderOwnerModule, CommentsModule, NotesModule, OwnersModule],
  controllers: [ShippingController],
  providers: [ShippingService],
})
export class ShippingModule {}

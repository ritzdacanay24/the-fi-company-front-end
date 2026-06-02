import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import { EmailModule } from '@/shared/email/email.module';
import { UsersModule } from '../users/users.module';
import { ShippingChecklistsController } from './shipping-checklists.controller';
import { ShippingChecklistsRepository } from './shipping-checklists.repository';
import { ShippingChecklistsService } from './shipping-checklists.service';

@Module({
  imports: [AccessControlModule, EmailModule, UsersModule],
  controllers: [ShippingChecklistsController],
  providers: [ShippingChecklistsService, ShippingChecklistsRepository],
  exports: [ShippingChecklistsService],
})
export class ShippingChecklistsModule {}

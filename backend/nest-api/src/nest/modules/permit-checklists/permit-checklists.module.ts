import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import { PermitChecklistsController } from './permit-checklists.controller';
import { PermitChecklistsRepository } from './permit-checklists.repository';
import { PermitChecklistsService } from './permit-checklists.service';

@Module({
  imports: [AccessControlModule],
  controllers: [PermitChecklistsController],
  providers: [PermitChecklistsService, PermitChecklistsRepository],
  exports: [PermitChecklistsService],
})
export class PermitChecklistsModule {}

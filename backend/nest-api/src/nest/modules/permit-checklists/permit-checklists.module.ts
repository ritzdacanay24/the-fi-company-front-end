import { Module } from '@nestjs/common';
import { PermitChecklistsController } from './permit-checklists.controller';
import { PermitChecklistsRepository } from './permit-checklists.repository';
import { PermitChecklistsService } from './permit-checklists.service';

@Module({
  controllers: [PermitChecklistsController],
  providers: [PermitChecklistsService, PermitChecklistsRepository],
  exports: [PermitChecklistsService],
})
export class PermitChecklistsModule {}

import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { PermitChecklistsController } from './permit-checklists.controller';
import { PermitChecklistsRepository } from './permit-checklists.repository';
import { PermitChecklistsService } from './permit-checklists.service';

@Module({
  imports: [AccessControlModule, FileStorageModule],
  controllers: [PermitChecklistsController],
  providers: [PermitChecklistsService, PermitChecklistsRepository],
  exports: [PermitChecklistsService],
})
export class PermitChecklistsModule {}

import { Module } from '@nestjs/common';
import { AccessControlController } from './access-control.controller';
import { AccessControlRepository } from './access-control.repository';
import { AccessControlService } from './access-control.service';
import { RolePermissionGuard } from './role-permission.guard';

@Module({
  controllers: [AccessControlController],
  providers: [AccessControlRepository, AccessControlService, RolePermissionGuard],
  exports: [AccessControlService, RolePermissionGuard],
})
export class AccessControlModule {}

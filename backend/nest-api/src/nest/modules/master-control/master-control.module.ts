import { Module } from '@nestjs/common';
import { MasterControlController } from './master-control.controller';
import { MasterControlService } from './master-control.service';

@Module({
  controllers: [MasterControlController],
  providers: [MasterControlService],
})
export class MasterControlModule {}

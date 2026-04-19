import { Module } from '@nestjs/common';
import { QualityVersionControlController } from './quality-version-control.controller';
import { QualityVersionControlService } from './quality-version-control.service';
import { QualityVersionControlRepository } from './quality-version-control.repository';

@Module({
  controllers: [QualityVersionControlController],
  providers: [QualityVersionControlService, QualityVersionControlRepository],
  exports: [QualityVersionControlService],
})
export class QualityVersionControlModule {}

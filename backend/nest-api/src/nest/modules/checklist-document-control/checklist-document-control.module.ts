import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import { QualityVersionControlModule } from '../quality-version-control/quality-version-control.module';
import { ChecklistDocumentControlController } from './checklist-document-control.controller';

@Module({
  imports: [AccessControlModule, QualityVersionControlModule],
  controllers: [ChecklistDocumentControlController],
})
export class ChecklistDocumentControlModule {}
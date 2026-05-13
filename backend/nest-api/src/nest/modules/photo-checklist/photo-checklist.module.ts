import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import { InspectionChecklistController } from './inspection-checklist.controller';
import { PhotoChecklistController } from './photo-checklist.controller';
import { PhotoChecklistService } from './photo-checklist.service';
import { PhotoChecklistRepository } from './photo-checklist.repository';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { ReportGeneratorService } from './report-generator.service';

@Module({
  imports: [AccessControlModule, FileStorageModule],
  controllers: [PhotoChecklistController, InspectionChecklistController],
  providers: [PhotoChecklistService, PhotoChecklistRepository, ReportGeneratorService],
  exports: [PhotoChecklistService, ReportGeneratorService],
})
export class PhotoChecklistModule {}

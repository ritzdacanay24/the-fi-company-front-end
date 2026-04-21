import { Module } from '@nestjs/common';
import { InspectionChecklistController } from './inspection-checklist.controller';
import { PhotoChecklistController } from './photo-checklist.controller';
import { PhotoChecklistService } from './photo-checklist.service';
import { PhotoChecklistRepository } from './photo-checklist.repository';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [FileStorageModule],
  controllers: [PhotoChecklistController, InspectionChecklistController],
  providers: [PhotoChecklistService, PhotoChecklistRepository],
  exports: [PhotoChecklistService],
})
export class PhotoChecklistModule {}

import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentsRepository } from './attachments.repository';
import { AttachmentsStorageService } from './attachments-storage.service';
import { AttachmentsMetadataService } from './attachments-metadata.service';

@Module({
  controllers: [AttachmentsController],
  providers: [
    AttachmentsService,
    AttachmentsRepository,
    AttachmentsStorageService,
    AttachmentsMetadataService,
  ],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}

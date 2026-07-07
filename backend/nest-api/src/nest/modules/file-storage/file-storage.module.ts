import { Module } from '@nestjs/common';
import { FileStorageController } from './file-storage.controller';
import { FileStorageService } from './file-storage.service';
import { S3UploadService } from './s3-upload.service';

@Module({
  controllers: [FileStorageController],
  providers: [FileStorageService, S3UploadService],
  exports: [FileStorageService, S3UploadService],
})
export class FileStorageModule {}

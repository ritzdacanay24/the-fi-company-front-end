import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileStorageService } from './file-storage.service';

@Controller('file-storage')
export class FileStorageController {
  constructor(private readonly service: FileStorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Body('bucket') bucket?: string,
    @Body('keyPrefix') keyPrefix?: string,
    @Body('folder') folder?: string,
    @Body('subFolder') subFolder?: string,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    if (bucket && bucket.trim()) {
      const stored = await this.service.storeUploadedFileInBucket(file, {
        bucket,
        keyPrefix,
      });

      return {
        success: true,
        bucket: stored.bucket,
        key: stored.key,
        fileName: stored.fileName,
        url: stored.url,
      };
    }

    const targetFolder = folder || subFolder || 'general';
    const fileName = await this.service.storeUploadedFile(file, targetFolder);
    const url = this.service.resolveLink(fileName, targetFolder);

    return {
      success: true,
      fileName,
      subFolder: targetFolder,
      url,
    };
  }
}

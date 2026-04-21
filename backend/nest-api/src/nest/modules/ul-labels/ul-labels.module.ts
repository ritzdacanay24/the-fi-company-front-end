import { Module } from '@nestjs/common';
import { UlLabelsController } from './ul-labels.controller';
import { UlLabelsService } from './ul-labels.service';
import { FileStorageModule } from '@/nest/modules/file-storage/file-storage.module';

@Module({
  imports: [FileStorageModule],
  controllers: [UlLabelsController],
  providers: [UlLabelsService],
})
export class UlLabelsModule {}

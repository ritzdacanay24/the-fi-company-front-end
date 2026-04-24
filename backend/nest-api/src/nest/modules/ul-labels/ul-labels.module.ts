import { Module } from '@nestjs/common';
import { UlLabelsController } from './ul-labels.controller';
import { UlLabelsService } from './ul-labels.service';
import { FileStorageModule } from '@/nest/modules/file-storage/file-storage.module';
import { AccessControlModule } from '@/nest/modules/access-control';

@Module({
  imports: [FileStorageModule, AccessControlModule],
  controllers: [UlLabelsController],
  providers: [UlLabelsService],
})
export class UlLabelsModule {}

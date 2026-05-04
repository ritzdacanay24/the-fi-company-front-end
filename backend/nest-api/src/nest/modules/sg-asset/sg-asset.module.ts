import { Module } from '@nestjs/common';
import { SgAssetController } from './sg-asset.controller';
import { SgAssetRepository } from './sg-asset.repository';
import { SgAssetService } from './sg-asset.service';

@Module({
  controllers: [SgAssetController],
  providers: [SgAssetService, SgAssetRepository],
  exports: [SgAssetService],
})
export class SgAssetModule {}

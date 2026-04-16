import { Module } from '@nestjs/common';
import { EyeFiAssetNumbersController } from './eyefi-asset-numbers.controller';
import { EyeFiAssetNumbersRepository } from './eyefi-asset-numbers.repository';
import { EyeFiAssetNumbersService } from './eyefi-asset-numbers.service';

@Module({
  controllers: [EyeFiAssetNumbersController],
  providers: [EyeFiAssetNumbersService, EyeFiAssetNumbersRepository],
})
export class EyeFiAssetNumbersModule {}

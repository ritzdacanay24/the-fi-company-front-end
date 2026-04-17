import { Module } from '@nestjs/common';
import { QualityOverviewController } from './quality-overview.controller';
import { QualityOverviewService } from './quality-overview.service';
import { QualityOverviewRepository } from './quality-overview.repository';

@Module({
  controllers: [QualityOverviewController],
  providers: [QualityOverviewService, QualityOverviewRepository],
  exports: [QualityOverviewService],
})
export class QualityOverviewModule {}

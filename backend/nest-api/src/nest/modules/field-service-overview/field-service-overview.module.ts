import { Module } from '@nestjs/common';
import { FieldServiceOverviewController } from './field-service-overview.controller';
import { FieldServiceOverviewService } from './field-service-overview.service';
import { FieldServiceOverviewRepository } from './field-service-overview.repository';

@Module({
  controllers: [FieldServiceOverviewController],
  providers: [FieldServiceOverviewService, FieldServiceOverviewRepository],
  exports: [FieldServiceOverviewService],
})
export class FieldServiceOverviewModule {}

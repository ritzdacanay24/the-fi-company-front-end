import { Module } from '@nestjs/common';
import { OrgChartController } from './org-chart.controller';
import { OrgChartService } from './org-chart.service';
import { OrgChartRepository } from './org-chart.repository';

@Module({
  controllers: [OrgChartController],
  providers: [OrgChartService, OrgChartRepository],
  exports: [OrgChartService],
})
export class OrgChartModule {}

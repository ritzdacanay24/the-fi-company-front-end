import { Module } from '@nestjs/common';
import { OrgChartTokenController } from './org-chart-token.controller';
import { OrgChartTokenService } from './org-chart-token.service';
import { OrgChartTokenRepository } from './org-chart-token.repository';

@Module({
  controllers: [OrgChartTokenController],
  providers: [OrgChartTokenService, OrgChartTokenRepository],
  exports: [OrgChartTokenService],
})
export class OrgChartTokenModule {}

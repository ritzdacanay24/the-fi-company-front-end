import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { ReportsService } from './reports.service';

@Controller('operations/logistics')
@UseGuards(RolePermissionGuard)
export class OperationsLogisticsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-report-config')
  async getDailyReportConfig(@Query('user_id') userId?: string) {
    return this.reportsService.getDailyReportConfig(userId);
  }
}

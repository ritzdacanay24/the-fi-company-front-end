import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { OrgChartService } from './org-chart.service';

@Controller('org-chart')
@UseGuards(RolePermissionGuard)
export class OrgChartController {
  constructor(private readonly service: OrgChartService) {}

  @Get('orgchart')
  async getOrgChart(@Query() query: Record<string, string>) {
    return this.service.getOrgChart(query);
  }

  @Get('hasSubordinates')
  async hasSubordinates(@Query('id') id: string) {
    return this.service.hasSubordinates(id);
  }
}

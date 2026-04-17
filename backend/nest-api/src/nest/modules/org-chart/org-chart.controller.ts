import { Controller, Get, Query } from '@nestjs/common';
import { OrgChartService } from './org-chart.service';

@Controller('org-chart')
export class OrgChartController {
  constructor(private readonly service: OrgChartService) {}

  @Get('orgchart')
  async getOrgChart(@Query() query: Record<string, string>) {
    return this.service.getOrgChart(query);
  }

  @Get('orgchart.php')
  async getOrgChartPhp(@Query() query: Record<string, string>) {
    return this.service.getOrgChart(query);
  }

  @Get('hasSubordinates')
  async hasSubordinates(@Query('id') id: string) {
    return this.service.hasSubordinates(id);
  }

  @Get('hasSubordinates.php')
  async hasSubordinatesPhp(@Query('id') id: string) {
    return this.service.hasSubordinates(id);
  }
}

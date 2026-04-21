import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { MasterControlService } from './master-control.service';

@Controller('master-control')
export class MasterControlController {
  constructor(private readonly service: MasterControlService) {}

  @Get('report-by-routing')
  async getMasterProductionReportByRouting(
    @Query('routing') routing?: string,
  ) {
    return this.service.getMasterProductionReportByRouting(routing || 'All');
  }

  @Get('pick-details')
  async getPickDetailsByWorkOrderNumber(
    @Query('workOrderNumber') workOrderNumber?: string,
    @Query('filteredSections') filteredSections?: string,
  ) {
    if (!workOrderNumber) {
      throw new BadRequestException('workOrderNumber is required');
    }

    return this.service.getPickDetailsByWorkOrderNumber(workOrderNumber, filteredSections || '');
  }
}

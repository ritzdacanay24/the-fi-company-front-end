import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { WorkOrderRoutingService } from './work-order-routing.service';

@Controller('work-order-routing')
@UseGuards(RolePermissionGuard)
export class WorkOrderRoutingController {
  constructor(private readonly service: WorkOrderRoutingService) {}

  @Get('work-order-routing')
  async readSingle(@Query('ReadSingle') part?: string): Promise<Record<string, unknown>[]> {
    const partNumber = String(part || '').trim();
    if (!partNumber) {
      return [];
    }

    return this.service.readSingle(partNumber);
  }

  @Get('get-routing-by-wo-number')
  async getRoutingByWoNumber(@Query('wo_nbr') woNumber?: string): Promise<Record<string, unknown>[]> {
    const workOrderNumber = String(woNumber || '').trim();
    if (!workOrderNumber) {
      return [];
    }

    return this.service.getRoutingByWoNumber(workOrderNumber);
  }
}

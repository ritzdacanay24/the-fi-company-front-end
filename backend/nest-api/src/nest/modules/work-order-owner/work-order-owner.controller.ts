import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { WorkOrderOwnerService } from './work-order-owner.service';

@Controller('shipping-misc')
@UseGuards(RolePermissionGuard)
export class WorkOrderOwnerController {
  constructor(private readonly service: WorkOrderOwnerService) {}

  @Get('find-one')
  async findOne(@Query('so') so?: string): Promise<Record<string, unknown>> {
    if (!so) {
      return {};
    }

    const row = await this.service.findOneBySo(so);
    return row ?? {};
  }
}

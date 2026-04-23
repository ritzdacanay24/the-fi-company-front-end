import { Controller, Get, Query } from '@nestjs/common';
import { WorkOrderOwnerService } from './work-order-owner.service';

@Controller('shipping-misc')
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

import { Controller, Get, Query } from '@nestjs/common';
import { NonBillableCodeService } from './non-billable-code.service';

@Controller('non-billable-code')
export class NonBillableCodeController {
  constructor(private readonly service: NonBillableCodeService) {}

  @Get('getAll')
  async getAll(@Query('selectedViewType') selectedViewType?: string) {
    return this.service.getAll(selectedViewType);
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }
}

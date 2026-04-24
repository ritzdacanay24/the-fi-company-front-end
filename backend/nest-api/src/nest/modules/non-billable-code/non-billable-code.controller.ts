import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { NonBillableCodeService } from './non-billable-code.service';

@Controller('non-billable-code')
@UseGuards(RolePermissionGuard)
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

  @Get('getById')
  async getByIdQuery(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }
}

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { NonBillableCodeService } from './non-billable-code.service';

@Controller('non-billable-code')
@UseGuards(RolePermissionGuard)
export class NonBillableCodeController {
  constructor(private readonly service: NonBillableCodeService) {}

  @Get()
  async getAll(@Query() query: Record<string, string>) {
    return this.service.getAll(query);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.update(id, payload);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}

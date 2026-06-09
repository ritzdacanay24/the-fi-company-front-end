import { BadRequestException, Body, Controller, Get, Headers, Post, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { PhysicalInventoryService } from './physical-inventory.service';
import { QadOdbcTarget } from '@/shared/database/qad-odbc.service';

type SavePhysicalInventoryPayload = {
  data?: Array<string | number>;
  type?: string;
};

@Controller('physical-inventory')
@UseGuards(RolePermissionGuard)
export class PhysicalInventoryController {
  constructor(private readonly service: PhysicalInventoryService) {}

  private resolveTarget(queryTarget?: string, headerTarget?: string): QadOdbcTarget | undefined {
    const target = String(queryTarget || headerTarget || '')
      .trim()
      .toLowerCase();

    if (!target) {
      return undefined;
    }

    if (target === 'dev' || target === 'test' || target === 'prod') {
      return target;
    }

    throw new BadRequestException('target must be one of: dev, test, prod');
  }

  @Get('inventory_tags')
  async getInventoryTags(
    @Query('target') queryTarget?: string,
    @Headers('x-qad-target') headerTarget?: string,
  ) {
    return this.service.getInventoryTags(this.resolveTarget(queryTarget, headerTarget));
  }

  @Get('get_last_tag')
  async getLastTag(
    @Query('target') queryTarget?: string,
    @Headers('x-qad-target') headerTarget?: string,
  ) {
    return this.service.getLastTag(this.resolveTarget(queryTarget, headerTarget));
  }

  @Get('summary')
  async getSummary(
    @Query('target') queryTarget?: string,
    @Headers('x-qad-target') headerTarget?: string,
  ) {
    return this.service.getInventorySummary(this.resolveTarget(queryTarget, headerTarget));
  }

  @Post('save')
  @Permissions('write')
  async save(
    @Body() payload: SavePhysicalInventoryPayload,
    @Query('target') queryTarget?: string,
    @Headers('x-qad-target') headerTarget?: string,
  ) {
    return this.service.save(payload?.data ?? [], payload?.type ?? '', this.resolveTarget(queryTarget, headerTarget));
  }
}

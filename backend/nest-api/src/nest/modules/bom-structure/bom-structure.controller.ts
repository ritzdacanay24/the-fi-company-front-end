import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { BomStructureService } from './bom-structure.service';

@Controller('bom-structure')
@UseGuards(RolePermissionGuard)
export class BomStructureController {
  constructor(private readonly service: BomStructureService) {}

  @Get()
  async getBomStructure(
    @Query('so') so?: string,
    @Query('part') part?: string,
    @Query('days') days?: string,
    @Query('max_levels') maxLevels?: string,
    @Query('level') level?: string,
    @Query('debug') debug?: string,
    @Query('graphics_only') graphicsOnly?: string,
    @Query('nested') nested?: string,
  ) {
    return this.service.getBomStructure({
      so,
      part,
      days,
      max_levels: maxLevels,
      level,
      debug,
      graphics_only: graphicsOnly,
      nested,
    });
  }
}

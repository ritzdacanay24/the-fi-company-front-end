import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { EyeFiAssetNumbersService } from './eyefi-asset-numbers.service';
import { GenerateAssetNumbersDto } from './dto/generate-asset-numbers.dto';

@Controller('eyefi-asset-numbers')
@UseGuards(RolePermissionGuard)
export class EyeFiAssetNumbersController {
  constructor(private readonly eyeFiAssetNumbersService: EyeFiAssetNumbersService) {}

  @Get()
  async getAvailable(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eyeFiAssetNumbersService.getAvailable(status, category, limit ? Number(limit) : undefined);
  }

  @Post('generate')
  @Permissions('write')
  async generate(@Body() dto: GenerateAssetNumbersDto) {
    return this.eyeFiAssetNumbersService.generate(dto);
  }
}

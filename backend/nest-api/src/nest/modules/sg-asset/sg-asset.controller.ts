import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Domain, Permissions, RolePermissionGuard } from '../access-control';
import { BulkCreateSgAssetDto } from './dto/bulk-create-sg-asset.dto';
import { CreateSgAssetDto } from './dto/create-sg-asset.dto';
import { UpdateSgAssetDto } from './dto/update-sg-asset.dto';
import { SgAssetService } from './sg-asset.service';

@Controller('quality/sg-asset')
@UseGuards(RolePermissionGuard)
@Domain('inventory')
export class SgAssetController {
  constructor(private readonly sgAssetService: SgAssetService) {}

  // REST endpoints
  @Get()
  async list(
    @Query('selectedViewType') selectedViewType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('isAll') isAll?: string,
  ) {
    return this.sgAssetService.getList({
      selectedViewType,
      dateFrom,
      dateTo,
      isAll: isAll === '1' || isAll === 'true',
    });
  }

  @Get('serials/check')
  async checkSerial(@Query('assetNumber') assetNumber?: string) {
    return this.sgAssetService.checkIfSerialIsFound(assetNumber);
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.sgAssetService.getById(id);
  }

  @Post()
  @Permissions('write')
  async createOne(@Body() payload: CreateSgAssetDto) {
    return this.sgAssetService.create(payload);
  }

  @Put(':id')
  @Permissions('manage')
  async updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateSgAssetDto,
  ) {
    return this.sgAssetService.updateById(id, payload);
  }

  @Delete(':id')
  @Permissions('delete')
  async deleteOne(@Param('id', ParseIntPipe) id: number) {
    return this.sgAssetService.deleteById(id);
  }

  @Post('bulk')
  @Permissions('write')
  async bulkCreateRest(@Body() payload: BulkCreateSgAssetDto) {
    return this.sgAssetService.bulkCreate(payload);
  }
}

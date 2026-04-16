import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { BulkCreateSgAssetDto } from './dto/bulk-create-sg-asset.dto';
import { CreateSgAssetDto } from './dto/create-sg-asset.dto';
import { UpdateSgAssetDto } from './dto/update-sg-asset.dto';
import { SgAssetService } from './sg-asset.service';

@Controller(['quality/sg-asset', 'Quality/sg-asset', 'sg-asset'])
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
  async createOne(@Body() payload: CreateSgAssetDto) {
    return this.sgAssetService.create(payload);
  }

  @Put(':id')
  async updateOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateSgAssetDto,
  ) {
    return this.sgAssetService.updateById(id, payload);
  }

  @Delete(':id')
  async deleteOne(@Param('id', ParseIntPipe) id: number) {
    return this.sgAssetService.deleteById(id);
  }

  @Post('bulk')
  async bulkCreateRest(@Body() payload: BulkCreateSgAssetDto) {
    return this.sgAssetService.bulkCreate(payload);
  }

  // Legacy compatibility endpoints
  @Get('getList')
  async getList(
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

  @Get('getAll')
  async getAll() {
    return this.sgAssetService.getAll();
  }

  @Get('getAll.php')
  async getAllPhp() {
    return this.sgAssetService.getAll();
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.sgAssetService.getById(id);
  }

  @Get('getById.php')
  async getByIdPhp(@Query('id', ParseIntPipe) id: number) {
    return this.sgAssetService.getById(id);
  }

  @Get('checkIfSerialIsFound')
  async checkIfSerialIsFound(@Query('assetNumber') assetNumber?: string) {
    return this.sgAssetService.checkIfSerialIsFound(assetNumber);
  }

  @Post('create')
  async create(@Body() payload: CreateSgAssetDto) {
    return this.sgAssetService.create(payload);
  }

  @Post('create.php')
  async createPhp(@Body() payload: CreateSgAssetDto) {
    return this.sgAssetService.create(payload);
  }

  @Put('updateById/:id')
  async updateById(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateSgAssetDto,
  ) {
    return this.sgAssetService.updateById(id, payload);
  }

  @Put('updateById.php')
  async updateByIdPhp(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: UpdateSgAssetDto,
  ) {
    return this.sgAssetService.updateById(id, payload);
  }

  @Delete('deleteById/:id')
  async deleteById(@Param('id', ParseIntPipe) id: number) {
    return this.sgAssetService.deleteById(id);
  }

  @Delete('deleteById.php')
  async deleteByIdPhp(@Query('id', ParseIntPipe) id: number) {
    return this.sgAssetService.deleteById(id);
  }

  @Post('bulkCreate.php')
  async bulkCreate(@Body() payload: BulkCreateSgAssetDto) {
    return this.sgAssetService.bulkCreate(payload);
  }
}

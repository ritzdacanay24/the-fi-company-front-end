import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permissions, RolePermissionGuard } from '../access-control';
import { AttachmentsService } from '../attachments/attachments.service';
import { QirService } from './qir.service';

@Controller('qir')
@UseGuards(RolePermissionGuard)
export class QirController {
  constructor(
    private readonly service: QirService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Get('getList')
  async getList(
    @Query('selectedViewType') selectedViewType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('isAll') isAll?: string,
  ) {
    return this.service.getList({
      selectedViewType,
      dateFrom,
      dateTo,
      isAll: isAll === '1' || isAll === 'true',
    });
  }

  @Get('searchQir')
  async searchQir(@Query('text') text?: string) {
    return this.service.searchQir(text || '');
  }

  @Get('find')
  async find(@Query() query: Record<string, string>) {
    return this.service.find(query);
  }

  @Get('getById')
  async getById(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Get('getQirById')
  async getQirById(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post('create')
  @Permissions('write')
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Post('create-public')
  async createPublic(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Post('upload-public')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPublic(
    @Body() payload: Record<string, unknown>,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    const normalizedPayload: Record<string, unknown> = {
      ...payload,
      field: 'Capa Request',
      subFolder: 'capa',
    };
    return this.attachmentsService.create(normalizedPayload, file);
  }

  @Put('updateById/:id')
  @Permissions('write')
  async updateByIdPath(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Put('updateById')
  @Permissions('write')
  async updateByIdQuery(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Delete('deleteById/:id')
  @Permissions('manage')
  async deleteByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }

  @Delete('deleteById')
  @Permissions('manage')
  async deleteByIdQuery(@Query('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }
}

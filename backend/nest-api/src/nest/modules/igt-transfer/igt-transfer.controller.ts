import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { IgtTransferService } from './igt-transfer.service';

@Controller('igt-transfer')
@UseGuards(RolePermissionGuard)
export class IgtTransferController {
  constructor(
    @Inject(IgtTransferService)
    private readonly igtTransferService: IgtTransferService,
  ) {}

  @Get('getList')
  async getList(
    @Query('selectedViewType') selectedViewType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('isAll') isAllRaw?: string,
  ) {
    const isAll = String(isAllRaw).toLowerCase() === 'true';
    return this.igtTransferService.getList({
      selectedViewType,
      dateFrom,
      dateTo,
      isAll,
    });
  }

  @Get('find')
  async find(@Query('igt_transfer_ID') igtTransferIdRaw?: string) {
    return this.igtTransferService.find(igtTransferIdRaw);
  }

  @Get('getHeader')
  async getHeader(@Query('id') idRaw?: string) {
    return this.igtTransferService.getHeader(idRaw);
  }

  @Get('getSoLineDetails')
  async getSoLineDetails(@Query('so_number') soNumber?: string) {
    return this.igtTransferService.getSoLineDetails(soNumber);
  }

  @Post('automatedIGTTransfer')
  @Permissions('write')
  async automatedIGTTransfer(
    @Query('id') idRaw?: string,
    @Body() payload?: unknown,
  ) {
    return this.igtTransferService.automatedIgtTransfer(idRaw, payload);
  }

  @Post()
  @Permissions('write')
  async create(@Body() payload?: unknown) {
    return this.igtTransferService.create(payload);
  }
}
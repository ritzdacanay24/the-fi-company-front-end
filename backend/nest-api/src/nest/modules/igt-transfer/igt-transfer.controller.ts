import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { IgtTransferService } from './igt-transfer.service';

@Controller('igt-transfer')
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

  @Get('getHeader')
  async getHeader(@Query('id') idRaw?: string) {
    return this.igtTransferService.getHeader(idRaw);
  }

  @Get('getSoLineDetails')
  async getSoLineDetails(@Query('so_number') soNumber?: string) {
    return this.igtTransferService.getSoLineDetails(soNumber);
  }

  @Post('automatedIGTTransfer')
  async automatedIGTTransfer(
    @Query('id') idRaw?: string,
    @Body() payload?: unknown,
  ) {
    return this.igtTransferService.automatedIgtTransfer(idRaw, payload);
  }
}
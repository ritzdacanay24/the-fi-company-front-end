import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { QadService } from './qad.service';
import { Public } from '@/nest/decorators/public.decorator';

@Controller('qad')
@UseGuards(RolePermissionGuard)
export class QadController {
  constructor(
    @Inject(QadService)
    private readonly qadService: QadService,
  ) {}

  @Get('searchSalesOrder')
  async searchSalesOrder(@Query('text') text?: string) {
    return this.qadService.searchSalesOrder(text);
  }

  @Get('searchPartNumber')
  async searchPartNumber(
    @Query('text') text?: string,
    @Query('matchCase') matchCaseRaw?: string,
  ) {
    const matchCase = String(matchCaseRaw).toLowerCase() === 'true';
    return this.qadService.searchPartNumber(text, matchCase);
  }

  @Get('searchWoNumber')
  async searchWoNumber(@Query('text') text?: string) {
    return this.qadService.searchWoNumber(text);
  }

  @Get('searchCustomerPartNumber')
  async searchCustomerPartNumber(@Query('text') text?: string) {
    return this.qadService.searchCustomerPartNumber(text);
  }

  @Public()
  @Get('public/searchCustomerPartNumber')
  async searchCustomerPartNumberPublic(@Query('text') text?: string) {
    return this.qadService.searchCustomerPartNumber(text);
  }

  @Get('searchCustomerName')
  async searchCustomerName(@Query('text') text?: string) {
    return this.qadService.searchCustomerName(text);
  }

  @Get('getAllCustomerName')
  async getAllCustomerName() {
    return this.qadService.getAllCustomerName();
  }
}

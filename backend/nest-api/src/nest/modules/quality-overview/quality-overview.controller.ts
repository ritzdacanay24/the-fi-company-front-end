import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { QualityOverviewService } from './quality-overview.service';

@Controller('quality-overview')
@UseGuards(RolePermissionGuard)
export class QualityOverviewController {
  constructor(private readonly service: QualityOverviewService) {}

  @Get('getOpenRequests')
  async getOpenRequests() {
    return this.service.getOpenRequests();
  }

  @Get('getOpenJobs')
  async getOpenJobs() {
    return this.service.getOpenJobs();
  }

  @Get('getOpenTickets')
  async getOpenTickets() {
    return this.service.getOpenTickets();
  }

  @Get('getOpenInvoice')
  async getOpenInvoice() {
    return this.service.getOpenInvoice();
  }

  @Get('getInvoiceSummary')
  async getInvoiceSummary(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.service.getInvoiceSummary(dateFrom || '', dateTo || '');
  }

  @Get('getJobSummary')
  async getJobSummary(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.service.getJobSummary(dateFrom || '', dateTo || '');
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { FieldServiceOverviewService } from './field-service-overview.service';

@Controller('field-service-overview')
export class FieldServiceOverviewController {
  constructor(private readonly service: FieldServiceOverviewService) {}

  @Get('getOpenRequests')
  getOpenRequests() {
    return this.service.getOpenRequests();
  }

  @Get('getOpenJobs')
  getOpenJobs() {
    return this.service.getOpenJobs();
  }

  @Get('getOpenTickets')
  getOpenTickets() {
    return this.service.getOpenTickets();
  }

  @Get('getOpenInvoice')
  getOpenInvoice() {
    return this.service.getOpenInvoice();
  }

  @Get('getInvoiceSummary')
  getInvoiceSummary(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.service.getInvoiceSummary(dateFrom || '', dateTo || '');
  }

  @Get('getJobSummary')
  getJobSummary(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.service.getJobSummary(dateFrom || '', dateTo || '');
  }
}

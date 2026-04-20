import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('getJobByUserReport')
  async getJobByUserReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getJobByUserReport(dateFrom, dateTo);
  }

  @Get('getJobByUserReportChart')
  async getJobByUserReportChart(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('typeOfView') typeOfView?: string,
  ) {
    return this.service.getJobByUserReportChart(dateFrom, dateTo, typeOfView);
  }

  @Get('getServiceReport')
  async getServiceReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getServiceReport(dateFrom, dateTo);
  }

  @Get('getServiceReportChart')
  async getServiceReportChart(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('typeOfView') typeOfView?: string,
  ) {
    return this.service.getServiceReportChart(dateFrom, dateTo, typeOfView);
  }

  @Get('getContractorVsTechReport')
  async getContractorVsTechReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getContractorVsTechReport(dateFrom, dateTo);
  }

  @Get('getContractorVsTechReportChart')
  async getContractorVsTechReportChart(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('typeOfView') typeOfView?: string,
  ) {
    return this.service.getContractorVsTechReportChart(dateFrom, dateTo, typeOfView);
  }

  @Get('getPlatformAvg')
  async getPlatformAvg(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getPlatformAvg(dateFrom, dateTo);
  }

  @Get('jobByLocation')
  async jobByLocation(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.jobByLocation(dateFrom, dateTo);
  }

  @Get('getInvoiceReport')
  async getInvoiceReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getInvoiceReport(dateFrom, dateTo);
  }

  @Get('getInvoiceByCustomerChart')
  async getInvoiceByCustomerChart(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('typeOfView') typeOfView?: string,
  ) {
    return this.service.getInvoiceByCustomerChart(dateFrom, dateTo, typeOfView);
  }

  @Get('getExpenseReport')
  async getExpenseReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getExpenseReport(dateFrom, dateTo);
  }

  @Get('getExpenseReportChart')
  async getExpenseReportChart(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('typeOfView') typeOfView?: string,
  ) {
    return this.service.getExpenseReportChart(dateFrom, dateTo, typeOfView);
  }

  @Get('getCustomerReport')
  async getCustomerReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getCustomerReport(dateFrom, dateTo);
  }

  @Get('getTicketEventReport')
  async getTicketEventReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('typeOfView') _typeOfView?: string,
  ) {
    return this.service.getTicketEventReport(dateFrom, dateTo);
  }

  @Get('getTicketEventReportChart')
  async getTicketEventReportChart(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('typeOfView') typeOfView?: string,
  ) {
    return this.service.getTicketEventReportChart(dateFrom, dateTo, typeOfView);
  }
}

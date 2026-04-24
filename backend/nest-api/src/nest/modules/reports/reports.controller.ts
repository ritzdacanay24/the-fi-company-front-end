import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(RolePermissionGuard)
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

  @Get('revenue-chart')
  async getRevenueChart(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('typeOfView') typeOfView?: string,
  ) {
    return this.service.getRevenueChart(dateFrom, dateTo, typeOfView);
  }

  @Get('future-revenue-by-customer')
  async getFutureRevenueByCustomer(
    @Query('applyAgsDiscount') applyAgsDiscount?: string,
    @Query('getFutureRevenueByCustomerByWeekly') getFutureRevenueByCustomerByWeekly?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('weekStart') weekStart?: string,
    @Query('weekEnd') weekEnd?: string,
  ) {
    return this.service.getFutureRevenueByCustomer(
      applyAgsDiscount,
      getFutureRevenueByCustomerByWeekly,
      start,
      end,
      weekStart,
      weekEnd,
    );
  }

  // ─── Operations Reports ──────────────────────────────────────────────────────

  @Get('jiaxing-location-value')
  async getJiaxingLocationValue(@Query('name') name?: string) {
    return this.service.getJiaxingLocationValue(name);
  }

  @Get('las-vegas-raw-material')
  async getLasVegasRawMaterial() {
    return this.service.getLasVegasRawMaterial();
  }

  @Get('shipped-orders-grouped')
  async getShippedOrdersGrouped(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getShippedOrdersGrouped(dateFrom, dateTo);
  }

  @Get('shipped-orders-chart')
  async getShippedOrdersChart(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('typeOfView') typeOfView?: string,
  ) {
    return this.service.getShippedOrdersChart(dateFrom, dateTo, typeOfView);
  }

  @Get('daily-report')
  async getDailyReport() {
    return this.service.getDailyReport();
  }

  @Get('one-sku-location-report')
  async getOneSkuLocationReport() {
    return this.service.getOneSkuLocationReport();
  }

  @Get('item-consolidation-report')
  async getItemConsolidationReport() {
    return this.service.getItemConsolidationReport();
  }

  @Get('inventory-valuation')
  async getInventoryValuation(@Query('showAll') showAll?: string) {
    return this.service.getInventoryValuation(showAll);
  }

  @Get('otd-report')
  async getOtdReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('displayCustomers') displayCustomers?: string,
    @Query('typeOfView') typeOfView?: string,
  ) {
    return this.service.getOtdReport(dateFrom, dateTo, displayCustomers, typeOfView);
  }

  @Get('otd-report-v1')
  async getOtdReportV1(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('displayCustomers') displayCustomers?: string,
    @Query('typeOfView') typeOfView?: string,
  ) {
    return this.service.getOtdReportV1(dateFrom, dateTo, displayCustomers, typeOfView);
  }

  @Get('otd-refresh')
  async refreshOtdData() {
    return this.service.refreshOtdData();
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const wipUrl = 'apiV2/wip-report';
const inventoryByProdLineUrl = 'apiV2/inventory-by-prod-line';
const dataScrubUrl = 'apiV2/data-scrub';
const reportsUrl = 'apiV2/reports';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  constructor(private http: HttpClient) { }

  private getWipEndpoint(): string {
    return wipUrl;
  }

  getWipReport = async () =>
    await firstValueFrom(this.http.get<any[]>(this.getWipEndpoint()));

  getTransitValueReport = async () =>
    await firstValueFrom(this.http.get<any[]>(`${reportsUrl}/jiaxing-location-value?name=TRANSIT`));

  getFgValueReport = async () =>
    await firstValueFrom(this.http.get<any[]>(`${reportsUrl}/jiaxing-location-value?name=FG`));

  getJxValueReport = async () =>
    await firstValueFrom(this.http.get<any[]>(`${reportsUrl}/jiaxing-location-value?name=JX01`));

  getLasVegasRawMaterial = async () =>
    await firstValueFrom(this.http.get<any[]>(`${reportsUrl}/las-vegas-raw-material`));

  getSafetyStock = async () =>
    await firstValueFrom(this.http.get<any[]>(`${inventoryByProdLineUrl}/getSafetyStock`));

  getShippedOrdersReport = async (dateFrom, dateTo) =>
    await firstValueFrom(this.http.get<any[]>(`${reportsUrl}/shipped-orders-grouped?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getShippedOrdersChart(dateFrom, dateTo, typeOfView, showCustomers) {
    return firstValueFrom(this.http.get<any>(`${reportsUrl}/shipped-orders-chart?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}&showCustomers=${showCustomers}`));
  }

  getDailyReport() {
    return firstValueFrom(this.http.get<any>(`${reportsUrl}/daily-report`));
  }

  getNegativeLcations = async () =>
    await firstValueFrom(this.http.get<any>(`${dataScrubUrl}/negative-locations`))

  getEmptyLocations = async () =>
    await firstValueFrom(this.http.get<any>(`${dataScrubUrl}/empty-locations`))

  getInventoryReport = async () =>
    await firstValueFrom(this.http.get<any>(`${inventoryByProdLineUrl}/pastDueOrders`))

  getInventoryValuationReport = async (showAll = 'All') =>
    await firstValueFrom(this.http.get<any>(`${reportsUrl}/inventory-valuation?showAll=${showAll}`))

  getOneSkuLocationReport = async () =>
    await firstValueFrom(this.http.get<any>(`${reportsUrl}/one-sku-location-report`))

  getItemConsolidationReport = async () =>
    await firstValueFrom(this.http.get<any>(`${reportsUrl}/item-consolidation-report`))

  getOtdReport = async (dateFrom, dateTo, displayCustomers, typeOfView) =>
    await firstValueFrom(this.http.get<any>(`${reportsUrl}/otd-report?dateFrom=${dateFrom}&dateTo=${dateTo}&displayCustomers=${displayCustomers}&typeOfView=${typeOfView}`))

  getOtdReportV1 = async (dateFrom, dateTo, displayCustomers, typeOfView) =>
    await firstValueFrom(this.http.get<any>(`${reportsUrl}/otd-report-v1?dateFrom=${dateFrom}&dateTo=${dateTo}&displayCustomers=${displayCustomers}&typeOfView=${typeOfView}`))

  refreshOtdData = async () =>
    await firstValueFrom(this.http.get<any>(`${reportsUrl}/otd-refresh`))

}


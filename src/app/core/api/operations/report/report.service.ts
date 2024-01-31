import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

let url = 'Operations/report/wip-report';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  constructor(private http: HttpClient) { }

  getWipReport = async () =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/WipReport/index`));

  getTransitValueReport = async () =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/JiaxingLocationValue/read?name=TRANSIT`));

  getFgValueReport = async () =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/JiaxingLocationValue/read?name=FG`));

  getLasVegasRawMaterial = async () =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/inventory_by_prod_line/las_vegas_raw_material`));

  getSafetyStock = async () =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/inventory_by_prod_line/getSafetyStock`));

  getShippedOrdersReport = async (dateFrom, dateTo) =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/shipped_orders/shipped_orders?getGroupedOrders&dateFrom=${dateFrom}&dateTo=${dateTo}`));

  getDailyReport() {
    return this.http.get<any>(`/DailyReport/read`).toPromise()
  }

  getNegativeLcations = async () =>
    await firstValueFrom(this.http.get<any>(`https://dashboard.eye-fi.com/server/Api/DataScrub/index?type=Negative Locations`))

  getEmptyLocations = async () =>
    await firstValueFrom(this.http.get<any>(`https://dashboard.eye-fi.com/server/Api/DataScrub/index?type=Locations with 0 items`))

  getInventoryReport = async () =>
    await firstValueFrom(this.http.get<any>(`https://dashboard.eye-fi.com/server/Api/inventory_by_prod_line/inventory_by_prod_line?pastDueOrders`))

  getOneSkuLocationReport = async () =>
    await firstValueFrom(this.http.get<any>(`https://dashboard.eye-fi.com/server/Api/OneSkuLocationReport/oneSkuLocationReport`))

  getItemConsolidationReport = async () =>
    await firstValueFrom(this.http.get<any>(`https://dashboard.eye-fi.com/server/Api/ItemConsolidation/itemConsolidationReport`))

}

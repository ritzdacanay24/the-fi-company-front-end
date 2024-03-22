import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'operations/master-scheduling';

@Injectable({
  providedIn: 'root'
})
export class MasterSchedulingService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getShipping = async () =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/Shipping/index?runOpenShippingReport`));

  getMasterProduction = async (routing) =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/MasterControl/index?getMasterProductionReportByRouting&routing=${routing}`));

  getPickingByWorkOrderId = async (workOrderId: number, filteredSections: any = ['Open Picks']) =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/MasterControl/index?workOrderNumber=${workOrderId}&filteredSections=${filteredSections}&getPickDetailsByWorkOrderNumber=1`));

  printWorkOrder(params: any) {
    return firstValueFrom(this.http.post(`/MasterControl/index`, params));
  }

  saveMisc(params: any) {
    return firstValueFrom(this.http.post(`/Shipping/index`, params));
  }
}

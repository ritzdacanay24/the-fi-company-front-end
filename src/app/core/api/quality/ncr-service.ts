import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'Quality/ncr';

@Injectable({
  providedIn: 'root'
})
export class NcrService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  getOpenSummary = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getOpenSummary`));

  getchart = async (dateFrom, dateTo, displayCustomers, typeOfView) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getchart?dateFrom=${dateFrom}&dateTo=${dateTo}&displayCustomers=${displayCustomers}&typeOfView=${typeOfView}`));

  updateAndSendEmailToDepartment = (id, params) => this.http.put(`/Ncr/updateAndSendEmailToDepartment?id=${id}`, params).toPromise();

}

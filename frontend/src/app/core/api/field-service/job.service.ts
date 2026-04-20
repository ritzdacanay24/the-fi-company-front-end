import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';

let url = 'FieldServiceMobile/job';
const schedulerV2Url = 'apiV2/scheduler';

@Injectable({
  providedIn: 'root'
})
export class JobService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getAllRequests = async (dateFrom, dateTo, selectedViewType?: string, isAll?: boolean) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getAll?dateFrom=${dateFrom}&dateTo=${dateTo}&selectedViewType=${selectedViewType}&isAll=${isAll}`));

  getOpenInvoice = async (dateFrom, dateTo, isAll?: boolean) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getOpenInvoice?dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  searchByJob(q: string): Observable<any> {
    let apiURL = `apiV2/scheduler/searchByJob?text=${q}`;
    return this.http.get(apiURL)
  }

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${schedulerV2Url}/${id}`));

  updateInvoice = async (id, params) =>
    await firstValueFrom(this.http.put<any[]>(`${url}/updateInvoice?id=${id}`, params));

}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';

let url = 'FieldServiceMobile/job';

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
    let apiURL = `${url}/searchByJob?text=${q}`;
    return this.http.get(apiURL)
  }

  updateInvoice = async (id, params) =>
    await firstValueFrom(this.http.put<any[]>(`${url}/updateInvoice?id=${id}`, params));

}

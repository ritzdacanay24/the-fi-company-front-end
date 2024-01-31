import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'operations/igt_transfer';

@Injectable({
  providedIn: 'root'
})
export class IgtTransferService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  getHeader = async (id) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getHeader?id=${id}`));

  getSoLineDetails = async (order: string) =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/Shipping/index?getLineNumbers&so_number=${order}`));

  automatedIGTTransfer(id, params: any) {
    return this.http.post(`${url}/automatedIGTTransfer?id=${id}`, params).toPromise()
  }
}

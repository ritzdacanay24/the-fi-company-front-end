import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'operations/material-request';

@Injectable({
  providedIn: 'root'
})
export class MaterialRequestService extends DataService<any> {

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
    return firstValueFrom(this.http.post(`${url}/automatedIGTTransfer?id=${id}`, params))
  }

  deleteLineItem(id) {
    return firstValueFrom(this.http.delete(`${url}/deleteLineItem?id=${id}`))
  }

  getPicking = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getPicking`));

  getValidation = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getValidation`));

  sendBackToValidation = async (params) => {
    return firstValueFrom(this.http.post(`${url}/sendBackToValidation`, params))
  }

  onPrint = async (params) => {
    return firstValueFrom(this.http.post(`${url}/onPrint`, params))
  }

  clearPrint = async (params) => {
    return firstValueFrom(this.http.post(`${url}/clearPrint`, params))
  }

  completePicking = async (params) => {
    return firstValueFrom(this.http.post(`${url}/completePicking`, params))
  }

}

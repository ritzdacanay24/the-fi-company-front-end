import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'Quality/sg-asset';

@Injectable({
  providedIn: 'root'
})
export class SgAssetService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  checkIfSerialIsFound = async (assetNumber) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/checkIfSerialIsFound?assetNumber=${assetNumber}`));

}

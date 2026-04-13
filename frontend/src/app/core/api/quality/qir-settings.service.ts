import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

let url = 'api/quality/qir-settings';

@Injectable({
  providedIn: 'root'
})

//https://dashboard.eye-fi.com/tasks/quality/qir-settings/find.php?active=1

export class QirSettingsService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  async getFormSettings(params) {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any[]>(`${url}/find.php${result}`));
  }

}

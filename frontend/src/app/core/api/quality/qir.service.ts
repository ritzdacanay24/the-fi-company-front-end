import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';

let url = 'Quality/qir';

@Injectable({
  providedIn: 'root'
})
export class QirService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  searchQir(q: string): Observable<any> {
    let apiURL = `${url}/searchQir?text=${q}`;
    return this.http.get(apiURL)
  }

  async createQir(params) {
    return await firstValueFrom(this.http.post(`https://dashboard.eye-fi.com/api/quality/qir/create.php`, params));
  }

  async getQirById(id) {
    return await firstValueFrom(this.http.get(`https://dashboard.eye-fi.com/api/quality/qir/getQirById.php?id=${id}`));
  }

}

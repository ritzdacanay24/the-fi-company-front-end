import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

let url = 'shortages';

@Injectable({
  providedIn: 'root'
})
export class ShortagesService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (params) => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any[]>(`${url}/getList${result}`));
  }


  createShortages(params) {
    params.createShortages = 1;
    return firstValueFrom(this.http.post<any>(`/Shortages/index`, params))
  }


  updateById(params: any) {
    return firstValueFrom(this.http.post<any>(`/Shortages/index`, params))
  }

}

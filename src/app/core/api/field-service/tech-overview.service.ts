import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from '@app/shared/util/queryString';

let url = 'FieldServiceMobile/tech-overview';

@Injectable({
  providedIn: 'root'
})
export class TechOverviewService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getJobs(params) {
    const result = queryString(params);
    return firstValueFrom(this.http.get(`${url}/getJobs${result}`))
  }

  getJobCompletion(userId) {
    return firstValueFrom(this.http.get(`${url}/getJobCompletion?userId=${userId}`))
  }

  getJobChart = async (dateFrom, dateTo, userId) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getJobChart?dateFrom=${dateFrom}&dateTo=${dateTo}&userId=${userId}`));

}

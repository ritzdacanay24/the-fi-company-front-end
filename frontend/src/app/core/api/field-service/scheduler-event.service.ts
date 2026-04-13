import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'FieldServiceMobile/scheduler-event';

@Injectable({
  providedIn: 'root'
})
export class SchedulerEventService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getAllRequests = async (dateFrom, dateTo) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getAll?dateFrom=${dateFrom}&dateTo=${dateTo}`));

}

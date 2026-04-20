import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

const schedulerEventV2Url = 'apiV2/scheduler-event';

@Injectable({
  providedIn: 'root'
})
export class SchedulerEventService extends DataService<any> {

  constructor(http: HttpClient) {
    super(schedulerEventV2Url, http);
  }

  getAllRequests = async (dateFrom: string, dateTo: string) =>
    await firstValueFrom(this.http.get<any[]>(`${schedulerEventV2Url}/getAllRequests?dateFrom=${dateFrom}&dateTo=${dateTo}`));

  override getAll = async (): Promise<any[]> =>
    await firstValueFrom(this.http.get<any[]>(`${schedulerEventV2Url}`));

  override getById = async (id: number): Promise<any> =>
    await firstValueFrom(this.http.get<any>(`${schedulerEventV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<any> =>
    await firstValueFrom(this.http.post<any>(`${schedulerEventV2Url}`, params));

  override update = async (id: string | number, params: Partial<any>): Promise<any> =>
    await firstValueFrom(this.http.put<any>(`${schedulerEventV2Url}/${id}`, params));

  override delete = async (id: number): Promise<any> =>
    await firstValueFrom(this.http.delete<any>(`${schedulerEventV2Url}/${id}`));

}

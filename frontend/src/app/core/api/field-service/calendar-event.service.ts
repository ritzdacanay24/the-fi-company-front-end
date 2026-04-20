import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

const calendarEventV2Url = 'apiV2/calendar-event';

@Injectable({
  providedIn: 'root'
})
export class CalendarEventService extends DataService<any> {

  constructor(http: HttpClient) {
    super(calendarEventV2Url, http);
  }

  override getAll = async (): Promise<any[]> =>
    await firstValueFrom(this.http.get<any[]>(`${calendarEventV2Url}`));

  override getById = async (id: number): Promise<any> =>
    await firstValueFrom(this.http.get<any>(`${calendarEventV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<any> =>
    await firstValueFrom(this.http.post<any>(`${calendarEventV2Url}`, params));

  override update = async (id: string | number, params: Partial<any>): Promise<any> =>
    await firstValueFrom(this.http.put<any>(`${calendarEventV2Url}/${id}`, params));

  override delete = async (id: number): Promise<any> =>
    await firstValueFrom(this.http.delete<any>(`${calendarEventV2Url}/${id}`));
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

const ticketEventV2Url = 'apiV2/ticket-event';

@Injectable({
  providedIn: 'root'
})
export class TicketEventService extends DataService<any> {

  constructor(http: HttpClient) {
    super(ticketEventV2Url, http);
  }

  override getAll = async (): Promise<any[]> =>
    await firstValueFrom(this.http.get<any[]>(`${ticketEventV2Url}`));

  override getById = async (id: number): Promise<any> =>
    await firstValueFrom(this.http.get<any>(`${ticketEventV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<any> =>
    await firstValueFrom(this.http.post<any>(`${ticketEventV2Url}`, params));

  override update = async (id: string | number, params: Partial<any>): Promise<any> =>
    await firstValueFrom(this.http.put<any>(`${ticketEventV2Url}/${id}`, params));

  override delete = async (id: number): Promise<any> =>
    await firstValueFrom(this.http.delete<any>(`${ticketEventV2Url}/${id}`));

}

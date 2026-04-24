import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { DataService } from '../DataService';
import { queryString } from 'src/assets/js/util/queryString';

const nonBillableCodeV2Url = 'apiV2/non-billable-code';

@Injectable({
  providedIn: 'root'
})
export class NonBillableCodeService extends DataService<any> {

  constructor(http: HttpClient) {
    super(nonBillableCodeV2Url, http);
  }

  getAllRequests = async (selectedViewType?: string) =>
    await firstValueFrom(
      this.http.get<any[]>(nonBillableCodeV2Url, {
        params: new HttpParams().set('selectedViewType', selectedViewType || 'Active'),
      }),
    );

  override getAll = async (): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>(nonBillableCodeV2Url));

  override find = async (params: Partial<any>): Promise<any[]> => {
    const qs = queryString(params);
    return firstValueFrom(this.http.get<any[]>(`${nonBillableCodeV2Url}${qs}`));
  };

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${nonBillableCodeV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> =>
    firstValueFrom(this.http.post<{ message: string; insertId?: number }>(nonBillableCodeV2Url, params));

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> =>
    firstValueFrom(this.http.put<{ message: string }>(`${nonBillableCodeV2Url}/${id}`, params));

  override delete = async (id: number) =>
    firstValueFrom(this.http.delete<{ message: string }>(`${nonBillableCodeV2Url}/${id}`));

}

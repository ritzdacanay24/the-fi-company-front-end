import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';

const jobV2Url = 'apiV2/job';
const schedulerV2Url = 'apiV2/scheduler';

@Injectable({
  providedIn: 'root'
})
export class JobService extends DataService<any> {

  constructor(http: HttpClient) {
    super(jobV2Url, http);
  }

  override findOne = async (params: Partial<any>): Promise<any> => {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );

    if (!Object.keys(cleanParams).length) {
      return null;
    }

    const query = new URLSearchParams(cleanParams as Record<string, string>).toString();
    return firstValueFrom(this.http.get<any>(`${jobV2Url}/findOne?${query}`));
  };

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(this.http.post<{ insertId?: number; message?: string }>(`${jobV2Url}`, params));
    return {
      message: response?.message ?? 'Created',
      insertId: response?.insertId,
    };
  };

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<any>(`${jobV2Url}/${id}`, params));
    return { message: 'Updated' };
  };

  getAllRequests = async (dateFrom, dateTo, selectedViewType?: string, isAll?: boolean) =>
    await firstValueFrom(this.http.get<any[]>(`${jobV2Url}/getAll?dateFrom=${dateFrom}&dateTo=${dateTo}&selectedViewType=${selectedViewType}&isAll=${isAll}`));

  getOpenInvoice = async (dateFrom, dateTo, isAll?: boolean) =>
    await firstValueFrom(this.http.get<any[]>(`${jobV2Url}/getOpenInvoice?dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  searchByJob(q: string): Observable<any> {
    let apiURL = `apiV2/scheduler/searchByJob?text=${q}`;
    return this.http.get(apiURL)
  }

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${schedulerV2Url}/${id}`));

  updateInvoice = async (id, params) =>
    await firstValueFrom(this.http.put<any[]>(`${jobV2Url}/updateInvoice/${id}`, params));

}

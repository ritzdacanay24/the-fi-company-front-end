import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

const serialV2Url = 'apiV2/serial';

@Injectable({
  providedIn: 'root'
})
export class SerialService extends DataService<any> {

  constructor(http: HttpClient) {
    super(serialV2Url, http);
  }

  override findOne = async (params: Partial<any>): Promise<any> => {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );

    if (!Object.keys(cleanParams).length) {
      return null;
    }

    const data = await this.find(cleanParams);
    return data?.[0] ?? null;
  };

  override find = async (params: Partial<any>): Promise<any[]> => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const url = query ? `${serialV2Url}/find?${query}` : `${serialV2Url}/find`;
    return firstValueFrom(this.http.get<any[]>(url));
  };

  override getAll = async (): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>(`${serialV2Url}`));

  override getById = async (id: string | number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${serialV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(this.http.post<any>(`${serialV2Url}`, params));
    return {
      message: response?.message ?? 'Created',
      insertId: response?.insertId ?? response?.id,
    };
  };

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<any>(`${serialV2Url}/${id}`, params));
    return { message: 'Updated' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<any>(`${serialV2Url}/${id}`));
    return { message: 'Deleted' };
  };

  getByWorkOrderId(workOrderId: string | number) {
    return firstValueFrom(this.http.get(`${serialV2Url}/getByWorkOrderId?workOrderId=${workOrderId}`));
  }

  updateById(id: string | number, params: Record<string, unknown>) {
    return firstValueFrom(this.http.put(`${serialV2Url}/${id}`, params));
  }

  deleteById(id: string | number) {
    return firstValueFrom(this.http.delete(`${serialV2Url}/${id}`));
  }

}

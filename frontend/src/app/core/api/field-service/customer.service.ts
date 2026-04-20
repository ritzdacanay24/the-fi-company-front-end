import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

const customerV2Url = 'apiV2/customer';

@Injectable({
  providedIn: 'root'
})
export class CustomerService extends DataService<any> {

  constructor(http: HttpClient) {
    super(customerV2Url, http);
  }

  override find = async (params: Partial<any>): Promise<any[]> => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const url = query ? `${customerV2Url}/find?${query}` : `${customerV2Url}/find`;
    return firstValueFrom(this.http.get<any[]>(url));
  };

  override getAll = async (): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>(`${customerV2Url}`));

  getAllRequests = async (_selectedViewType?: string): Promise<any[]> =>
    this.getAll();

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${customerV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(
      this.http.post<{ id?: number; insertId?: number; message?: string }>(`${customerV2Url}`, params),
    );

    return {
      message: response?.message ?? 'Created',
      insertId: response?.insertId ?? response?.id,
    };
  };

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<any>(`${customerV2Url}/${id}`, params));
    return { message: 'Updated' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<any>(`${customerV2Url}/${id}`));
    return { message: 'Deleted' };
  };
}

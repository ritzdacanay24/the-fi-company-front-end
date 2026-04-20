import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

const companyV2Url = 'apiV2/company';

@Injectable({
  providedIn: 'root'
})
export class CompanyService extends DataService<any> {

  constructor(http: HttpClient) {
    super(companyV2Url, http);
  }

  override find = async (params: Partial<any>): Promise<any[]> => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const url = query ? `${companyV2Url}/find?${query}` : `${companyV2Url}/find`;
    return firstValueFrom(this.http.get<any[]>(url));
  };

  override getAll = async (selectedViewType?: string): Promise<any[]> => {
    const query = selectedViewType ? `?selectedViewType=${encodeURIComponent(selectedViewType)}` : '';
    return firstValueFrom(this.http.get<any[]>(`${companyV2Url}${query}`));
  };

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${companyV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(
      this.http.post<{ id?: number; insertId?: number; message?: string }>(`${companyV2Url}`, params),
    );

    return {
      message: response?.message ?? 'Created',
      insertId: response?.insertId ?? response?.id,
    };
  };

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<any>(`${companyV2Url}/${id}`, params));
    return { message: 'Updated' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<any>(`${companyV2Url}/${id}`));
    return { message: 'Deleted' };
  };

}

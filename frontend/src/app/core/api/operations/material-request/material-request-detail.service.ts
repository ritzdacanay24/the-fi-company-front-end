import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

const url = 'apiV2/material-request-detail';

@Injectable({
  providedIn: 'root'
})
export class MaterialRequestDetailService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  override find = async (query: Partial<any>): Promise<any[]> => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    return firstValueFrom(this.http.get<any[]>(`${url}/find?${params.toString()}`));
  }

  override getAll = async (): Promise<any[]> => firstValueFrom(this.http.get<any[]>(`${url}/getAll`));

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));

  override create = async (data: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(this.http.post<{ insertId?: number }>(`${url}/create`, data));
    return {
      message: 'Created successfully',
      insertId: response?.insertId,
    };
  }

  override update = async (id: string | number, data: Partial<any>): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<{ rowCount: number }>(`${url}/updateById?id=${id}`, data));
    return { message: 'Updated successfully' };
  }

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<{ rowCount: number }>(`${url}/deleteById?id=${id}`));
    return { message: 'Deleted successfully' };
  }
}

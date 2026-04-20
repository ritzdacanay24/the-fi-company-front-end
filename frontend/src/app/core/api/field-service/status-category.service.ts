import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

const statusCategoryV2Url = 'apiV2/status-category';

@Injectable({
  providedIn: 'root'
})
export class StatusCategoryService extends DataService<any> {

  constructor(http: HttpClient) {
    super(statusCategoryV2Url, http);
  }

  override find = async (params: Partial<any>): Promise<any[]> => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const url = query ? `${statusCategoryV2Url}/find?${query}` : `${statusCategoryV2Url}/find`;
    return firstValueFrom(this.http.get<any[]>(url));
  };

  override getAll = async (): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>(`${statusCategoryV2Url}`));

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${statusCategoryV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> =>
    firstValueFrom(this.http.post<{ message: string; insertId?: number }>(`${statusCategoryV2Url}`, params));

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> =>
    firstValueFrom(this.http.put<{ message: string }>(`${statusCategoryV2Url}/${id}`, params));

}

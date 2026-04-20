import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

const receiptCategoryV2Url = 'apiV2/receipt-category';

@Injectable({
  providedIn: 'root'
})
export class ReceiptCategoryService extends DataService<any> {

  constructor(http: HttpClient) {
    super(receiptCategoryV2Url, http);
  }

  override find = async (params: Partial<any>): Promise<any[]> => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const url = query ? `${receiptCategoryV2Url}/find?${query}` : `${receiptCategoryV2Url}/find`;
    return firstValueFrom(this.http.get<any[]>(url));
  };

  override getAll = async (selectedViewType?: string): Promise<any[]> => {
    const query = selectedViewType ? `?selectedViewType=${encodeURIComponent(selectedViewType)}` : '';
    return firstValueFrom(this.http.get<any[]>(`${receiptCategoryV2Url}${query}`));
  };

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${receiptCategoryV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(
      this.http.post<{ id?: number; insertId?: number; message?: string }>(`${receiptCategoryV2Url}`, params),
    );

    return {
      message: response?.message ?? 'Created',
      insertId: response?.insertId ?? response?.id,
    };
  };

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<any>(`${receiptCategoryV2Url}/${id}`, params));
    return { message: 'Updated' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<any>(`${receiptCategoryV2Url}/${id}`));
    return { message: 'Deleted' };
  };

}

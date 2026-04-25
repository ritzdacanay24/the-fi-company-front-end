import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

const url = 'apiV2/qir-settings';

@Injectable({
  providedIn: 'root'
})

export class QirSettingsService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  override find = async (params: any): Promise<any[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any[]>(`${url}/find${result}`));
  };

  override getAll = async (): Promise<any[]> =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getAll`));

  override getById = async (id: number): Promise<any> =>
    await firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));

  override create = async (params: any): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(this.http.post<{ insertId?: number }>(`${url}/create`, params));
    return {
      message: 'QIR setting created successfully',
      insertId: response?.insertId,
    };
  };

  override update = async (id: number | string, params: any): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<{ rowCount?: number }>(`${url}/updateById/${id}`, params));
    return { message: 'QIR setting updated successfully' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<{ rowCount?: number }>(`${url}/deleteById/${id}`));
    return { message: 'QIR setting deleted successfully' };
  };

  /**
   * @deprecated Use getFormSettings() with no args — now points to the new
   * qir-options/form-settings endpoint backed by the normalized tables.
   */
  async getFormSettings(_params?: any) {
    return firstValueFrom(
      this.http.get<any[]>('apiV2/qir-options/form-settings'),
    );
  }

  // ── Admin / manage endpoints for the new normalized tables ────────────────

  getCategories = async (): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>('apiV2/qir-options/categories'));

  getOptions = async (params: { category_id?: number; active?: number } = {}): Promise<any[]> => {
    const qs = queryString(params);
    return firstValueFrom(this.http.get<any[]>(`apiV2/qir-options${qs}`));
  };

  getOptionById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`apiV2/qir-options/${id}`));

  createOption = async (payload: Record<string, unknown>): Promise<{ insertId: number }> =>
    firstValueFrom(this.http.post<{ insertId: number }>('apiV2/qir-options', payload));

  updateOption = async (id: number, payload: Record<string, unknown>): Promise<{ rowCount: number }> =>
    firstValueFrom(this.http.put<{ rowCount: number }>(`apiV2/qir-options/${id}`, payload));

  deleteOption = async (id: number): Promise<{ rowCount: number }> =>
    firstValueFrom(this.http.delete<{ rowCount: number }>(`apiV2/qir-options/${id}`));

  updateCategory = async (id: number, payload: Record<string, unknown>): Promise<{ rowCount: number }> =>
    firstValueFrom(this.http.put<{ rowCount: number }>(`apiV2/qir-options/categories/${id}`, payload));

}

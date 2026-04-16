import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

const url = 'apiV2/safety-incident';

@Injectable({
  providedIn: 'root',
})
export class SafetyIncidentService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (
    selectedViewType: string,
    dateFrom: string,
    dateTo: string,
    isAll = false
  ) => {
    return await firstValueFrom(
      this.http.get<any[]>(
        `${url}/getList?selectedViewType=${encodeURIComponent(selectedViewType)}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}&isAll=${isAll}`
      )
    );
  };

  override find = async (params: any): Promise<any[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any[]>(`${url}/find${result}`));
  };

  override findOne = async (params: any): Promise<any> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any>(`${url}/findOne${result}`));
  };

  override getAll = async (): Promise<any[]> => {
    return await firstValueFrom(this.http.get<any[]>(`${url}/getAll`));
  };

  override getById = async (id: number): Promise<any> => {
    return await firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));
  };

  override create = async (params: any): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(
      this.http.post<any>(`${url}/create`, params)
    );

    return {
      message: 'Safety incident created successfully',
      insertId: response?.id,
    };
  };

  override update = async (id: number | string, params: any): Promise<{ message: string }> => {
    await firstValueFrom(
      this.http.put<any>(`${url}/updateById/${id}`, params)
    );
    return { message: 'Safety incident updated successfully' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(
      this.http.delete<any>(`${url}/deleteById/${id}`)
    );
    return { message: 'Safety incident deleted successfully' };
  };
}

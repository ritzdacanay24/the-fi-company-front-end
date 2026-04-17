import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

const url = 'apiV2/qir-response';

@Injectable({
  providedIn: 'root'
})
export class QirResponseService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  override getAll = async (): Promise<any[]> =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getAll`));

  override getById = async (id: number): Promise<any> =>
    await firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));

  override find = async (params: any): Promise<any[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any[]>(`${url}/find${result}`));
  };

  override findOne = async (params: any): Promise<any> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any>(`${url}/findOne${result}`));
  };

  override create = async (params: any): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(this.http.post<{ insertId?: number }>(`${url}/create`, params));
    return {
      message: 'QIR response created successfully',
      insertId: response?.insertId,
    };
  };

  override update = async (id: string | number, params: any): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<{ rowCount?: number }>(`${url}/updateById/${id}`, params));
    return { message: 'QIR response updated successfully' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<{ rowCount?: number }>(`${url}/deleteById/${id}`));
    return { message: 'QIR response deleted successfully' };
  };

}

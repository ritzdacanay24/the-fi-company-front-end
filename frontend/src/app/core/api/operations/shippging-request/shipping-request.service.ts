import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

const url = 'apiV2/shipping-request';

@Injectable({
  providedIn: 'root'
})
export class ShippingRequestService extends DataService<any> {

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
      message: 'Shipping request created successfully',
      insertId: response?.insertId,
    };
  };

  override update = async (id: string | number, params: any): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<{ rowCount?: number }>(`${url}/updateById/${id}`, params));
    return { message: 'Shipping request updated successfully' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<{ rowCount?: number }>(`${url}/deleteById/${id}`));
    return { message: 'Shipping request deleted successfully' };
  };

}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

const url = 'apiV2/placard';

@Injectable({
  providedIn: 'root'
})
export class PlacardService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) => {
    const result = queryString({ selectedViewType, dateFrom, dateTo, isAll });
    return await firstValueFrom(this.http.get<any[]>(`${url}/getList${result}`));
  };

  getPlacardBySoSearch = async (order: string, partNumber: string, line: string) =>
    await firstValueFrom(
      this.http.get<any>(
        `${url}/getPlacardBySoSearch?order=${encodeURIComponent(order)}&partNumber=${encodeURIComponent(partNumber)}&line=${encodeURIComponent(line)}`,
      ),
    );

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
      message: 'Placard created successfully',
      insertId: response?.insertId,
    };
  };

  override update = async (id: number | string, params: any): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<{ rowCount?: number }>(`${url}/updateById/${id}`, params));
    return { message: 'Placard updated successfully' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<{ rowCount?: number }>(`${url}/deleteById/${id}`));
    return { message: 'Placard deleted successfully' };
  };

  searchSerialNumber(serialNumber: string) {
    return firstValueFrom(
      this.http.get<any>(`${url}/searchSerialNumber?serialNumber=${encodeURIComponent(serialNumber)}`),
    );
  }

  validateWo(woNumber: string) {
    return firstValueFrom(
      this.http.get<any>(`${url}/validateWo?validateWo=${encodeURIComponent(woNumber)}`),
    );
  }

}

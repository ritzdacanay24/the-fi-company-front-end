import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

const url = 'apiV2/qir';

@Injectable({
  providedIn: 'root'
})
export class QirService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  searchQir(q: string): Observable<any> {
    let apiURL = `${url}/searchQir?text=${q}`;
    return this.http.get(apiURL)
  }

  override getById = async (id: number): Promise<any> =>
    await firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));

  override create = async (
    params: any,
  ): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(this.http.post<{ insertId?: number }>(`${url}/create`, params));
    return {
      message: 'QIR created successfully',
      insertId: response?.insertId,
    };
  };

  override update = async (id: number | string, params: any): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<{ rowCount?: number }>(`${url}/updateById/${id}`, params));
    return { message: 'QIR updated successfully' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<{ rowCount?: number }>(`${url}/deleteById/${id}`));
    return { message: 'QIR deleted successfully' };
  };

  override find = async (params: any): Promise<any[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any[]>(`${url}/find${result}`));
  };

  async createQir(params: any) {
    return this.create(params);
  }

  async getQirById(id: number) {
    return this.getById(id);
  }

}

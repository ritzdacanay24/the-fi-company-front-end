import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';

const url = 'apiV2/forklift-inspection';
const legacyUrl = 'operations/forklift-inspection';

@Injectable({
  providedIn: 'root'
})
export class ForkliftInspectionService extends DataService<any> {

  constructor(http: HttpClient) {
    super(legacyUrl, http);
  }


  getList = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList`));

  override find = async (params: any): Promise<any[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any[]>(`${url}/find${result}`));
  };

  override findOne = async (params: any): Promise<any> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any>(`${url}/findOne${result}`));
  };

  override getAll = async (): Promise<any[]> => {
    return await firstValueFrom(this.http.get<any[]>(`${url}/getList`));
  };

  override getById = async (id: number): Promise<any> => {
    return await firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));
  };

  override create = async (params: any): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(this.http.post<any>(`${url}/create`, params));
    return {
      message: response?.message || 'Successfully created',
      insertId: response?.insertId,
    };
  };

  override update = async (id: number | string, params: any): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<any>(`${url}/updateById?id=${id}`, params));
    return { message: 'Successfully updated' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<any>(`${url}/deleteById?id=${id}`));
    return { message: 'Successfully deleted' };
  };


  async _create(params: any) {
    return await firstValueFrom(this.http.put<any>(`${url}/index`, params));
  }


  async _searchById(id: number) {
    return await firstValueFrom(this.http.get<any>(`${url}/index?searchById=${id}`));
  }


}

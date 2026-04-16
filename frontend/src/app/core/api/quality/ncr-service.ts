import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

const url = 'apiV2/ncr';

@Injectable({
  providedIn: 'root'
})
export class NcrService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  getOpenSummary = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getOpenSummary`));

  getchart = async (dateFrom, dateTo, displayCustomers, typeOfView) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getchart?dateFrom=${dateFrom}&dateTo=${dateTo}&displayCustomers=${displayCustomers}&typeOfView=${typeOfView}`));

  override getById = async (id: number): Promise<any> =>
    await firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));

  override create = async (
    params: any,
  ): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(
      this.http.post<{ insertId?: number }>(`${url}/create`, params),
    );

    return {
      message: 'NCR created successfully',
      insertId: response?.insertId,
    };
  };

  override update = async (
    id: number | string,
    params: any,
  ): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<{ rowCount?: number }>(`${url}/updateById/${id}`, params));
    return { message: 'NCR updated successfully' };
  };

  updateAndSendEmailToDepartment = async (id: number, params: any) =>
    await firstValueFrom(this.http.put(`${url}/updateAndSendEmailToDepartment?id=${id}`, params));

}

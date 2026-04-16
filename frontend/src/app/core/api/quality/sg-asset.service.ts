import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'apiv2/quality/sg-asset';

@Injectable({
  providedIn: 'root'
})
export class SgAssetService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  checkIfSerialIsFound = async (assetNumber) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/serials/check?assetNumber=${assetNumber}`));

  override getAll = async (): Promise<any[]> =>
    await firstValueFrom(this.http.get<any[]>(`${url}`));

  override getById = async (id: number): Promise<any> =>
    await firstValueFrom(this.http.get<any>(`${url}/${id}`));

  override create = async (params: any): Promise<{ message: string; insertId?: number }> =>
    await firstValueFrom(this.http.post<{ message: string; insertId?: number }>(`${url}`, params));

  override update = async (id: string | number, params: any): Promise<{ message: string }> =>
    await firstValueFrom(this.http.put<{ message: string }>(`${url}/${id}`, params));

  override delete = async (id: number): Promise<{ message: string }> =>
    await firstValueFrom(this.http.delete<{ message: string }>(`${url}/${id}`));

  /**
   * Bulk create multiple SG assets in a single transaction
   * @param assignments Array of assignment objects with serialNumber, sgPartNumber, poNumber, etc.
   * @param userFullName Full name of the user creating the assets (for inspector_name and consumed_by)
   * @returns Promise with bulk creation response
   */
  bulkCreate = async (assignments: any[], userFullName: string) =>
    await firstValueFrom(this.http.post<any>(`${url}/bulk`, {
      assignments,
      user_full_name: userFullName
    }));

}

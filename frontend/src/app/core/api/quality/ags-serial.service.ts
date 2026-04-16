import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

const url = 'apiV2/quality/ags-serial';

@Injectable({
  providedIn: 'root'
})
export class AgsSerialService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  override getById = async (id: number) =>
    await firstValueFrom(this.http.get<any>(`${url}/${id}`));

  override create = async (payload: any) =>
    await firstValueFrom(this.http.post<any>(url, payload));

  override update = async (id: number, payload: any) =>
    await firstValueFrom(this.http.put<any>(`${url}/${id}`, payload));

  override delete = async (id: number) =>
    await firstValueFrom(this.http.delete<any>(`${url}/${id}`));

  checkIfSerialIsFound = async (assetNumber: string) =>
    await firstValueFrom(this.http.get<any>(`${url}/serials/check?assetNumber=${assetNumber}`));

  /**
   * Bulk create multiple AGS serials in a single transaction.
   * @param assignments Array of assignment objects.
   * @param userFullName Full name of the user (for inspector_name and consumed_by).
   */
  bulkCreate = async (assignments: any[], userFullName: string) =>
    await firstValueFrom(this.http.post<any>(`${url}/bulk`, {
      assignments,
      user_full_name: userFullName,
    }));

}

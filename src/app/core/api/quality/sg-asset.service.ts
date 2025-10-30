import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'Quality/sg-asset';

@Injectable({
  providedIn: 'root'
})
export class SgAssetService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  checkIfSerialIsFound = async (assetNumber) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/checkIfSerialIsFound?assetNumber=${assetNumber}`));

  /**
   * Bulk create multiple SG assets in a single transaction
   * @param assignments Array of assignment objects with serialNumber, sgPartNumber, poNumber, etc.
   * @param userFullName Full name of the user creating the assets (for inspector_name and consumed_by)
   * @returns Promise with bulk creation response
   */
  bulkCreate = async (assignments: any[], userFullName: string) =>
    await firstValueFrom(this.http.post<any>(`${url}/bulkCreate.php`, { 
      assignments,
      user_full_name: userFullName 
    }));

}

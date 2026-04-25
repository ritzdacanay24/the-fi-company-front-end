import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'apiV2/igt-transfer';
const igtTransferApiV2Url = 'apiV2/igt-transfer';

@Injectable({
  providedIn: 'root'
})
export class IgtTransferService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (selectedViewType: string) =>
    await firstValueFrom(this.http.get<any[]>(`${igtTransferApiV2Url}/getList?selectedViewType=${selectedViewType}`));

  override find = async (params: { igt_transfer_ID: number | string }) =>
    await firstValueFrom(this.http.get<any[]>(`${igtTransferApiV2Url}/find?igt_transfer_ID=${params.igt_transfer_ID}`));

  getHeader = async (id) =>
    await firstValueFrom(this.http.get<any[]>(`${igtTransferApiV2Url}/getHeader?id=${id}`));

  getSoLineDetails = async (order: string) =>
    await firstValueFrom(this.http.get<any[]>(`${igtTransferApiV2Url}/getSoLineDetails?so_number=${order}`));

  automatedIGTTransfer(id, params: any) {
    return this.http.post(`${igtTransferApiV2Url}/automatedIGTTransfer?id=${id}`, params).toPromise()
  }
}

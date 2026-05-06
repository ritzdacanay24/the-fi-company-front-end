import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

const url = 'apiV2/material-request';
const igtTransferV2Url = 'apiV2/igt-transfer';

@Injectable({
  providedIn: 'root'
})
export class MaterialRequestService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  override find = async (query: Partial<any>): Promise<any[]> => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    return firstValueFrom(this.http.get<any[]>(`${url}/find?${params.toString()}`));
  }

  override getAll = async (): Promise<any[]> => firstValueFrom(this.http.get<any[]>(`${url}/getAll`));

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));

  override create = async (data: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(this.http.post<{ insertId?: number }>(`${url}/create`, data));
    return {
      message: 'Created successfully',
      insertId: response?.insertId,
    };
  }

  override update = async (id: string | number, data: Partial<any>): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<{ rowCount: number }>(`${url}/updateById?id=${id}`, data));
    return { message: 'Updated successfully' };
  }

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<{ rowCount: number }>(`${url}/deleteById?id=${id}`));
    return { message: 'Deleted successfully' };
  }

  getList = async (selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));

  getHeader = async (id: number) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getHeader?id=${id}`));

  getSoLineDetails = async (order: string) =>
    await firstValueFrom(this.http.get<any[]>(`${igtTransferV2Url}/getSoLineDetails?so_number=${encodeURIComponent(String(order ?? ''))}`));

  automatedIGTTransfer(id: number, params: any) {
    return firstValueFrom(this.http.post(`${url}/automatedIGTTransfer?id=${id}`, params))
  }

  deleteLineItem(id: number) {
    return firstValueFrom(this.http.delete(`${url}/deleteLineItem?id=${id}`))
  }

  getPicking = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getPicking`));

  getValidation = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getValidation`));

  sendBackToValidation = async (params: { id: number }) => {
    return firstValueFrom(this.http.post(`${url}/sendBackToValidation`, params))
  }

  onPrint = async (params: { data?: any[]; details?: any[] }) => {
    const data = Array.isArray(params?.data)
      ? params.data
      : (Array.isArray(params?.details) ? params.details : []);

    return firstValueFrom(this.http.post(`${url}/onPrint`, { data }))
  }

  clearPrint = async (params: { data?: any[]; details?: any[] }) => {
    const data = Array.isArray(params?.data)
      ? params.data
      : (Array.isArray(params?.details) ? params.details : []);

    return firstValueFrom(this.http.post(`${url}/clearPrint`, { data }))
  }

  // Kanban board specific methods
  getAllWithStatus = () => {
    return this.http.get<any[]>(`${url}/getAllWithStatus`);
  }

  updateStatus = (id: number, status: string) => {
    return this.http.put(`${url}/updateStatus?id=${id}`, { status });
  }

  getBulkRequestReviews = (requestIds: number[]) => {
    const idsParam = requestIds.join(',');
    return this.http.get<any>(`${url}/getBulkRequestReviews?request_ids=${idsParam}`);
  }

  completePicking = async (params: { id: number; data?: any[]; details?: any[]; pickedCompletedDate: string }) => {
    const data = Array.isArray(params?.data)
      ? params.data
      : (Array.isArray(params?.details) ? params.details : []);

    return firstValueFrom(this.http.post(`${url}/completePicking`, {
      id: params.id,
      pickedCompletedDate: params.pickedCompletedDate,
      data,
    }))
  }

  searchByItem(itemNumber: any[]) {
    const payload = encodeURIComponent(JSON.stringify(itemNumber || []));
    return firstValueFrom(
      this.http.get<any[]>(`${url}/searchItemByQadPartNumber?searchItemByQadPartNumber=${payload}`)
    );
  }

}

import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

const workOrderV2Url = 'apiV2/work-order';

@Injectable({
  providedIn: 'root'
})
export class WorkOrderService extends DataService<any>  {

  constructor(http: HttpClient) {
    super(workOrderV2Url, http);
  }

  override findOne = async (params: Partial<any>): Promise<any> => {
    const cleanParams = Object.fromEntries(
      Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );

    if (Object.keys(cleanParams).length === 0) {
      return null;
    }

    const query = new URLSearchParams(cleanParams as Record<string, string>).toString();
    return firstValueFrom(this.http.get<any>(`${workOrderV2Url}/findOne?${query}`));
  };

  override getById = async (id: string | number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${workOrderV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<any> =>
    firstValueFrom(this.http.post<any>(`${workOrderV2Url}`, params));

  override update = async (id: string | number, params: Partial<any>): Promise<any> =>
    firstValueFrom(this.http.put<any>(`${workOrderV2Url}/${id}`, params));

  override delete = async (id: number): Promise<any> =>
    firstValueFrom(this.http.delete<any>(`${workOrderV2Url}/${id}`));

  getByWorkOrderId(workOrderId: string | number) {
    return firstValueFrom(this.http.get(`${workOrderV2Url}/getByWorkOrderId?workOrderId=${workOrderId}`));
  }

  updateById(id: string | number, params: Record<string, unknown>) {
    return firstValueFrom(this.http.put(`${workOrderV2Url}/${id}`, params));
  }

  deleteById(id: string | number) {
    return firstValueFrom(this.http.delete(`${workOrderV2Url}/${id}`));
  }

  getAllRequests(selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) {
    return firstValueFrom(this.http.get(`${workOrderV2Url}/getAll?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`));
  }

  updateByIdBillingReview(id: string | number, params: Record<string, unknown>) {
    return firstValueFrom(this.http.put(`${workOrderV2Url}/billing-review/${id}`, params));
  }
}

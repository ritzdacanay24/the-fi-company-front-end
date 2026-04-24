import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

const requestV2Url = 'apiV2/request';
const publicRequestV2Url = 'apiV2/public/field-service';
const jobV2Url = 'apiV2/job';

@Injectable({
  providedIn: 'root'
})
export class RequestService extends DataService<any> {

  constructor(http: HttpClient) {
    super(requestV2Url, http);
  }

  override getById = async (id: string | number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${requestV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(this.http.post<any>(`${requestV2Url}`, params));
    return {
      message: response?.message ?? 'Created',
      insertId: response?.insertId ?? response?.id,
    };
  };

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<any>(`${requestV2Url}/${id}`, params));
    return { message: 'Updated' };
  };

  createFieldServiceRequest(params, sendEmail = false) {
    const isPublicPayload =
      params &&
      typeof params === 'object' &&
      ('customer_name' in params || 'service_type' in params || 'description' in params);

    if (isPublicPayload) {
      return firstValueFrom(this.http.post<any>(`${publicRequestV2Url}/requests`, params)).then((response) => ({
        ...response,
        id: response?.id ?? response?.requestId,
        insertId: response?.insertId ?? response?.id ?? response?.requestId,
      }));
    }

    return firstValueFrom(this.http.post<any>(`${requestV2Url}`, { ...params, sendEmail })).then((response) => ({
      ...response,
      id: response?.id,
      insertId: response?.insertId ?? response?.id,
    }));
  }

  getByToken(token) {
    return firstValueFrom(this.http.get(`${publicRequestV2Url}/requests/by-token?token=${encodeURIComponent(token)}`));
  }

  getjobByRequestId(request_id) {
    return firstValueFrom(this.http.get(`${jobV2Url}/findOne?request_id=${encodeURIComponent(request_id)}`));
  }

  getAllRequests(selectedViewType?: string) {
    return firstValueFrom(this.http.get(`${requestV2Url}/getAllRequests?selectedViewType=${selectedViewType}`))
  }

  getChart = async (dateFrom, dateTo, displayCustomers, typeOfView) =>
    await firstValueFrom(this.http.get<any>(`${requestV2Url}/getChart?dateFrom=${dateFrom}&dateTo=${dateTo}&displayCustomers=${encodeURIComponent(displayCustomers)}&typeOfView=${typeOfView}`))


  onRequestChanges(params, sendEmail = false) {
    const requestId = Number(params?.fs_request_id ?? params?.request_id ?? 0);
    const token = String(params?.token || '').trim();

    if (!requestId || !token) {
      throw new Error('request_id and token are required');
    }

    return firstValueFrom(
      this.http.post<{ message: string; id?: number }>(
        `${publicRequestV2Url}/requests/${requestId}/comments?token=${encodeURIComponent(token)}`,
        {
          name: params?.name,
          comment: params?.comment,
          request_change: !!params?.request_change,
          sendEmail,
        },
      ),
    );
  }
}

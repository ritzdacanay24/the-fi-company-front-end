import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

const requestV2Url = 'apiV2/request';

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
    return firstValueFrom(this.http.post<{ message: string, id?: number }>(`https://dashboard.eye-fi.com/tasks/createFsRequest.php?sendEmail=${sendEmail}`, params))
  }

  getByToken(token) {
    return firstValueFrom(this.http.get(`https://dashboard.eye-fi.com/tasks/fieldService/requests/getByToken.php?token=${token}`));
  }

  getjobByRequestId(request_id) {
    return firstValueFrom(this.http.get(`https://dashboard.eye-fi.com/tasks/fieldService/jobs/getByRequestId.php?request_id=${request_id}`));
  }

  getAllRequests(selectedViewType?: string) {
    return firstValueFrom(this.http.get(`${requestV2Url}/getAllRequests?selectedViewType=${selectedViewType}`))
  }

  getChart = async (dateFrom, dateTo, displayCustomers, typeOfView) =>
    await firstValueFrom(this.http.get<any>(`${requestV2Url}/getChart?dateFrom=${dateFrom}&dateTo=${dateTo}&displayCustomers=${encodeURIComponent(displayCustomers)}&typeOfView=${typeOfView}`))


  onRequestChanges(params, sendEmail = false) {
    return firstValueFrom(this.http.post<{ message: string, id?: number }>(`https://dashboard.eye-fi.com/tasks/onRequestChanges.php?sendEmail=${sendEmail}`, params))
  }
}

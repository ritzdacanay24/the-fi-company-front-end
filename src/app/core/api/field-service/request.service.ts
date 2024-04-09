import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/request';

@Injectable({
  providedIn: 'root'
})
export class RequestService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

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
    return firstValueFrom(this.http.get(`${url}/getAllRequests.php?selectedViewType=${selectedViewType}`))
  }

  getChart = async (dateFrom, dateTo, displayCustomers, typeOfView) =>
    await firstValueFrom(this.http.get<any>(`${url}/getChart?dateFrom=${dateFrom}&dateTo=${dateTo}&displayCustomers=${encodeURIComponent(displayCustomers)}&typeOfView=${typeOfView}`))


}

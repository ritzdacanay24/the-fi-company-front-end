import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'FieldServiceMobile/customer';

@Injectable({
  providedIn: 'root'
})
export class CustomerService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getAllRequests = async (selectedViewType?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getAll?selectedViewType=${selectedViewType}`));
}

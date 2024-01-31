import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/non-billable-code';

@Injectable({
  providedIn: 'root'
})
export class NonBillableCodeService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getAllRequests = async (selectedViewType?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getAll?selectedViewType=${selectedViewType}`));

}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'FieldServiceMobile/vendor';

@Injectable({
  providedIn: 'root'
})
export class VendorService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getAllRequests = async (selectedViewType) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getAll?selectedViewType=${selectedViewType}`));

}

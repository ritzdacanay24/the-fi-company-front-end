import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'FieldServiceMobile/license';

@Injectable({
  providedIn: 'root'
})
export class LicenseService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  override getAll = async (selectedViewType?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getAll?selectedViewType=${selectedViewType}`));

}

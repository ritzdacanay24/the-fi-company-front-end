import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';

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

  searchLicense(q: string): Observable<any> {
    let apiURL = `${url}/searchLicense?text=${q}`;
    return this.http.get(apiURL)
  }

  getByIdAndTechs = async (id?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getByIdAndTechs?id=${id}`));


}

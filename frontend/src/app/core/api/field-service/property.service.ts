import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';

let url = 'FieldServiceMobile/property';

@Injectable({
  providedIn: 'root'
})
export class PropertyService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getAllPropertyByText(text?: any) {
    return this.http.get<any>(`${url}/getAllPropertyByText?text=${text}`).toPromise();
  }

  searchProperty(q: string): Observable<any> {
    let apiURL = `${url}/getAllPropertyByText?text=${q}`;
    return this.http.get(apiURL)
  }

  override getAll = async (selectedViewType?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getAll?selectedViewType=${selectedViewType}`));


}

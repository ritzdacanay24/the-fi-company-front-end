import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';

let url = 'qad';
const qadApiV2Url = 'apiV2/qad';

@Injectable({
  providedIn: 'root'
})

export class QadService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  searchSoNumber(q: string): Observable<any> {
    let apiURL = `${qadApiV2Url}/searchSalesOrder?text=${q}`;
    return this.http.get(apiURL)
  }

  searchPartNumber(q: string, matchCase): Observable<any> {
    let apiURL = `${qadApiV2Url}/searchPartNumber?text=${q}&matchCase=${matchCase}`;
    return this.http.get(apiURL)
  }

  asyncSearchWoNumber(q: string) {
    let apiURL = `${qadApiV2Url}/searchWoNumber?text=${q}`;
    return this.http.get(apiURL).toPromise()
  }
  searchWoNumber(q: string): Observable<any> {
    let apiURL = `${qadApiV2Url}/searchWoNumber?text=${q}`;
    return this.http.get(apiURL)
  }

  searchCustomerPartNumber(q: string): Observable<any> {
    let apiURL = `${qadApiV2Url}/searchCustomerPartNumber?text=${q}`;
    return this.http.get(apiURL)
  }

  searchCustomerName(q: string): Observable<any> {
    let apiURL = `${qadApiV2Url}/searchCustomerName?text=${q}`;
    return this.http.get(apiURL)
  }

  getAllCustomerName = async () =>
    await firstValueFrom(this.http.get<any[]>(`${qadApiV2Url}/getAllCustomerName`));


}

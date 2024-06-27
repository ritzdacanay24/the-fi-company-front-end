import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';

let url = 'qad';

@Injectable({
  providedIn: 'root'
})

export class QadService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  searchSoNumber(q: string): Observable<any> {
    let apiURL = `${url}/searchSalesOrder?text=${q}`;
    return this.http.get(apiURL)
  }

  searchPartNumber(q: string, matchCase): Observable<any> {
    let apiURL = `${url}/searchPartNumber?text=${q}&matchCase=${matchCase}`;
    return this.http.get(apiURL)
  }

  asyncSearchWoNumber(q: string) {
    let apiURL = `${url}/searchWoNumber?text=${q}`;
    return this.http.get(apiURL).toPromise()
  }
  searchWoNumber(q: string): Observable<any> {
    let apiURL = `${url}/searchWoNumber?text=${q}`;
    return this.http.get(apiURL)
  }

  searchCustomerPartNumber(q: string): Observable<any> {
    let apiURL = `${url}/searchCustomerPartNumber?text=${q}`;
    return this.http.get(apiURL)
  }

  searchCustomerName(q: string): Observable<any> {
    let apiURL = `${url}/searchCustomerName?text=${q}`;
    return this.http.get(apiURL)
  }

  getAllCustomerName = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getAllCustomerName`));


}

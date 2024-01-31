import { Injectable } from '@angular/core';
import { Observable, } from 'rxjs';
import { HttpClient } from '@angular/common/http';


interface Shipping {
}

interface ShippingMisc {
}

interface Misc {
}

@Injectable({
  providedIn: 'root'
})
export class ShippingService {
  constructor(private http: HttpClient) { }

  automatedIGTTransfer(params: any) {
    return this.http.post(`/Shipping/transfer.php`, params).toPromise()
  }

  getLineNumbers(so_number) {
    return (this.http.get(`/Shipping/index?getLineNumbers&so_number=${so_number}`)).toPromise()
  }

  getData(): Observable<Shipping[]> {
    return this.http.get<Shipping[]>(`/Shipping/index?runOpenShippingReport`);
  }

  getMisc(soNumberAndLineNumber: string): Observable<ShippingMisc> {
    return this.http.get<ShippingMisc>(`/userTrans/getUserTransByFieldName.php?so=${soNumberAndLineNumber}`);
  }

  getShippingChanges(soNumberAndLineNumber: string) {
    return this.http.get(`/Shipping/index?shippingChangesAll=${soNumberAndLineNumber}`);
  }

  saveMisc(params: Misc): Observable<any> {
    return this.http.post(`/Shipping/index`, params);
  }

  saveMiscArray(params: Misc[]): Observable<any> {
    return this.http.post(`/Shipping/index?saveMiscArray=1`, params);
  }

  getShippingChangesReport(dateFrom: string): Observable<any> {
    return this.http.get(`/Shipping/index?shippingChangesReport=${dateFrom}`);
  }

  getProductionCommitDateChangeCount(so: string): Observable<any> {
    return this.http.get(`/Shipping/index?getProductionCommitDateChangeCount=${so}`);
  }

}


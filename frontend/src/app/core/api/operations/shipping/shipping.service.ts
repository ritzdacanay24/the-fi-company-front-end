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
    const id = params?.id ?? params?.transferId;
    const query = id !== undefined && id !== null ? `?id=${encodeURIComponent(String(id))}` : '';
    return this.http.post(`apiV2/igt-transfer/automatedIGTTransfer${query}`, params).toPromise();
  }

  getLineNumbers(so_number) {
    return this.http.get(`apiV2/igt-transfer/getSoLineDetails?so_number=${encodeURIComponent(String(so_number ?? ''))}`).toPromise();
  }

  getData(): Observable<Shipping[]> {
    return this.http.get<Shipping[]>(`apiV2/shipping/read-open-report`);
  }

  getMisc(soNumberAndLineNumber: string): Observable<ShippingMisc> {
    return this.http.get<ShippingMisc>(`apiV2/user-transactions/get-user-trans-by-field-name?so=${encodeURIComponent(soNumberAndLineNumber)}`);
  }

  getMiscAysnc(soNumberAndLineNumber: string) {
    return this.http.get<ShippingMisc>(`apiV2/user-transactions/get-user-trans-by-field-name?so=${encodeURIComponent(soNumberAndLineNumber)}`).toPromise();
  }

  getShippingChanges(soNumberAndLineNumber: string) {
    return this.http.get(`/Shipping/index?shippingChangesAll=${soNumberAndLineNumber}`);
  }

  saveMisc(params: Misc): Observable<any> {
    return this.http.post(`apiV2/shipping/save-misc`, params);
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


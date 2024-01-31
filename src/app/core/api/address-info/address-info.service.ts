import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class AddressInfoService {
    constructor(private http: HttpClient) { }

    getData(addressCode: string): Observable<any> {
        return this.http.get<any>(`/ShipToAddress/index?read=${addressCode}`)
    }
}

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class WorkOrderRoutingService {
    constructor(private http: HttpClient) { }

    getDataByItem(partNumber: string): Observable<any> {
        return this.http.get<any>(`apiV2/work-order-routing/work-order-routing?ReadSingle=${encodeURIComponent(partNumber)}`);
    }
    getRoutingByWoNumber(wo_nbr: string): Observable<any> {
        return this.http.get<any>(`apiV2/work-order-routing/get-routing-by-wo-number?wo_nbr=${encodeURIComponent(wo_nbr)}`);
    }

    
}

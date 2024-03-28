import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class WorkOrderRoutingService {
    constructor(private http: HttpClient) { }

    getDataByItem(partNumber: string): Observable<any> {
        return this.http.get<any>(`/work_order_routing/work_order_routing?ReadSingle=${partNumber}`);
    }
    getRoutingByWoNumber(wo_nbr: string): Observable<any> {
        return this.http.get<any>(`/work_order_routing/getRoutingByWoNumber?wo_nbr=${wo_nbr}`);
    }

    
}

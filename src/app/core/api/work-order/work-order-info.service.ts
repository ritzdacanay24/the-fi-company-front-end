import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class WorkOrderInfoService {
    constructor(private http: HttpClient) { }

    getSalesOrderNumberDetails(salesOrderNumber: string): Observable<any> {
        return this.http.get<any>(`/work_order_search/work_order_search?Read&order=${salesOrderNumber}`);
    }
    getCustomerOrderNumbers(customerCoNumber: number): Observable<any> {
        return this.http.get<any>(`/work_order_search/work_order_search?getCustomerOrderNumbers=${customerCoNumber}`);
    }
    getTransactions(customerCoNumber: string): Observable<any> {
        return this.http.get<any>(`/work_order_search/work_order_search?getTransactions=${customerCoNumber}`);
    }
}

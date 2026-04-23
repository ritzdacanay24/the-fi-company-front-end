import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class SalesOrderInfoService {
    constructor(private http: HttpClient) { }

    getSalesOrderNumberDetails(salesOrderNumber: string): Observable<any> {
        return this.http.get<any>(`apiV2/sales-order-search/read?order=${salesOrderNumber}`);
    }
    getCustomerOrderNumbers(customerCoNumber: number): Observable<any> {
        return this.http.get<any>(`apiV2/sales-order-search/customer-order-numbers?customerOrderNumber=${customerCoNumber}`);
    }
    getTransactions(customerCoNumber: string): Observable<any> {
        return this.http.get<any>(`apiV2/sales-order-search/transactions?order=${customerCoNumber}`);
    }
}

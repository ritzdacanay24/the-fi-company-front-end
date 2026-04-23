import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class WorkOrderInfoService {
    constructor(private http: HttpClient) { }

    getSalesOrderNumberDetails(salesOrderNumber: string): Observable<any> {
        return this.http.get<any>(`apiV2/work-order/legacy-read?order=${salesOrderNumber}`);
    }
    getCustomerOrderNumbers(customerCoNumber: number): Observable<any> {
        return this.http.get<any>(`apiV2/work-order/customer-order-numbers?customerOrderNumber=${customerCoNumber}`);
    }
    getTransactions(customerCoNumber: string): Observable<any> {
        return this.http.get<any>(`apiV2/work-order/transactions?order=${customerCoNumber}`);
    }
        getDataByWorkOrderNumber(workOrderNumber: number): Observable<any> {
            return this.http.get<any>(`apiV2/work-order/details?workOrderNumber=${workOrderNumber}`);
        }
        getWipReport(): Observable<any> {
            return this.http.get<any>(`apiV2/wip-report`);
        }
}

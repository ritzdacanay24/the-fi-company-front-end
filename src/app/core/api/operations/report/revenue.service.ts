import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class RevenueService {

    constructor(private http: HttpClient) { }

    // Read details
    getRevenue(dateFrom: string, dateTo: string): Observable<any> {
        return this.http.get<any>(`/revenue/revenue_details?dateFrom=${dateFrom}&dateTo=${dateTo}`);
    }

    // Read Chart Info
    getChartData(dateFrom: string, dateTo: string, typeOfView: string) {
        return this.http.get<any>(`/revenue/revenue?getGroupedOrders&dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}`).toPromise()
    }

    // Read revenue future by customer
    getFutureRevenueByCustomer() {
        return this.http.get<any>(`/revenue/future_revenue_by_customer`).toPromise()
    }
    // Read revenue future by customer
    getFutureRevenueByCustomerByWeekly(date) {
        return this.http.get<any>(`/revenue/future_revenue_by_customer?getFutureRevenueByCustomerByWeekly=${date}`).toPromise()
    }

}
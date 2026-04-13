import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

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
    async getFutureRevenueByCustomer(excludeTariffFees: boolean = false): Promise<any> {
        let params = new HttpParams();
        if (excludeTariffFees) {
            params = params.set('applyAgsDiscount', 'true');
        }
  // Debug logging
    console.log('excludeTariffFees:', excludeTariffFees);
    console.log('params object:', params);
    console.log('params toString:', params.toString());
    console.log('params keys:', params.keys());

        return this.http.get<any>('/revenue/future_revenue_by_customer', { params }).toPromise();
    }

    // Read revenue future by customer
    async getFutureRevenueByCustomerByWeekly(
        start: string,
        end: string,
        weekStart: string,
        weekEnd: string,
        excludeTariffFees: boolean = false
    ): Promise<any> {
        let params = new HttpParams()
            .set('start', start)
            .set('end', end)
            .set('weekStart', weekStart)
            .set('weekEnd', weekEnd)
            .set('getFutureRevenueByCustomerByWeekly', 'true');

        if (excludeTariffFees) {
            params = params.set('applyAgsDiscount', 'true');
        }

        console.log('getFutureRevenueByCustomerByWeekly params', params);
        return this.http.get<any>('/revenue/future_revenue_by_customer', { params }).toPromise();
    }

}
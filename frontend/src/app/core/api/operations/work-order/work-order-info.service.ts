import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class WorkOrderInfoService {
    constructor(private http: HttpClient) { }

    getDataByWorkOrderNumber(workOrderNumber: number) {
        return this.http.get<any>(`apiV2/work-order/details?workOrderNumber=${workOrderNumber}`).toPromise();
    }
    getWipReport(): Observable<any> {
        return this.http.get<any>(`apiV2/wip-report`);
    }

    getCompletedWorkers() {
        return this.http.get<any>(`/work_order_view/completedWorkOrders`).toPromise();
    }
}

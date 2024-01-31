import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class WorkOrderInfoService {
    constructor(private http: HttpClient) { }

    getDataByWorkOrderNumber(workOrderNumber: number) {
        return this.http.get<any>(`/work_order_view/work_order_view?Details=${workOrderNumber}`).toPromise();
    }
    getWipReport(): Observable<any> {
        return this.http.get<any>(`/WipReport/index`);
    }
}

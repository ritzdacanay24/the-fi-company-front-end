import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class LateReasonCodesService {

  constructor(private http: HttpClient, private router: Router) { }

  getData(department = ""): Observable<any> {
    return this.http.get<any>(`/LateReasonCodes/read?department=${department}`);
  }
  save(params): Observable<any> {
    return this.http.post<any>(`/LateReasonCodes/save`, params);
  }
  remove(params): Observable<any> {
    return this.http.post<any>(`/LateReasonCodes/remove`, params);
  }

  getKpi(dateFrom, dateTo, typeOfView, queue): Observable<any> {
    return this.http.get<any>(`/LateReasonCodes/kpi?dateFrom=${dateFrom}&dateTo=${dateTo}&typeOfView=${typeOfView}&queue=${queue}`);
  }

}

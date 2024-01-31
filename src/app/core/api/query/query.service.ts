import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class QueryService {
  constructor(private http: HttpClient) { }

  getData(query: string): Observable<any> {
    return this.http.get<any>(`/qad_tables/qad_tables?query=${query}`);
  }
  getQuery(): Observable<any> {
    return this.http.get<any>(`/qad_tables/qad_tables?test1=1`);
  }
}

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class QueryService {
  constructor(private http: HttpClient) { }
  private readonly queryV2Url = 'apiV2/qad-tables';

  getData(query: string): Observable<any> {
    return this.http.post<any>(`${this.queryV2Url}`, {query: query});
  }

  getQuery(): Observable<any> {
    return this.http.get<any>(`${this.queryV2Url}?test1=1`);
  }
}

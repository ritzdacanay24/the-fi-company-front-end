import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { createHttpParams } from 'src/assets/js/util';

@Injectable({
  providedIn: 'root'
})
export class ReceivingService {
  private readonly apiUrl = 'apiV2/receiving/read';

  constructor(private http: HttpClient) { }

  getData(start, end) {
    return this.http.get<any>(`${this.apiUrl}?start=${start}&end=${end}`).toPromise();
  }
  getById(id) {
    return this.http.get<any>(`${this.apiUrl}?id=${id}`).toPromise();
  }

  create(params: any): Observable<any> {
    let httpParams = createHttpParams(params);
    return this.http.post(`${this.apiUrl}`, httpParams)
  }

  update(id, params) {
    return this.http.put(`${this.apiUrl}?id=${id}`, params)
  }

  delete(id): Observable<any> {
    return this.http.delete(`${this.apiUrl}?id=${id}`)
  }

  uploadfile(id, file: File) {
    let formParams = new FormData();
    formParams.append('file', file)
    return this.http.post(`/Receiving/uploadFile?id=${id}`, formParams).toPromise();
  }


  getAttachment(id) {
    return this.http.get<any>(`${this.apiUrl}?getAttachment=${id}`).toPromise();
  }
  deleteAttachment(id) {
    return this.http.delete<any>(`${this.apiUrl}?deleteAttachment=${id}`).toPromise();
  }


}

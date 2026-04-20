import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

const qirV2Url = 'apiV2/fs-qir';

@Injectable({
  providedIn: 'root'
})
export class QirService {

  constructor(private http: HttpClient) { }

  getByWorkOrderId(workOrderId) {
    return firstValueFrom(this.http.get(`${qirV2Url}/getByWorkOrderId?workOrderId=${workOrderId}`))
  }

  getById(id) {
    return firstValueFrom(this.http.get(`${qirV2Url}/getById?id=${id}`))
  }

  updateById(id, params) {
    return firstValueFrom(this.http.put(`${qirV2Url}/updateById?id=${id}`, params))
  }

  deleteById(id) {
    return firstValueFrom(this.http.delete(`${qirV2Url}/deleteById?id=${id}`))
  }

  create(params) {
    return firstValueFrom(this.http.post(`${qirV2Url}/create`, params))
  }

}

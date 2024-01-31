import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

let url = 'FieldServiceMobile/qir';

@Injectable({
  providedIn: 'root'
})
export class QirService {

  constructor(private http: HttpClient) { }

  getByWorkOrderId(workOrderId) {
    return firstValueFrom(this.http.get(`${url}/getByWorkOrderId.php?workOrderId=${workOrderId}`))
  }

  getById(id) {
    return firstValueFrom(this.http.get(`${url}/getById.php?id=${id}`))
  }

  updateById(id, params) {
    return firstValueFrom(this.http.put(`${url}/updateById.php?id=${id}`, params))
  }

  deleteById(id) {
    return firstValueFrom(this.http.delete(`${url}/deleteById.php?id=${id}`))
  }

  create(params) {
    return firstValueFrom(this.http.post(`${url}/create.php`, params))
  }

}

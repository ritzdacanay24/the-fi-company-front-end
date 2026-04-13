import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/serial';

@Injectable({
  providedIn: 'root'
})
export class SerialService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getByWorkOrderId(workOrderId) {
    return firstValueFrom(this.http.get(`${url}/getByWorkOrderId.php?workOrderId=${workOrderId}`))
  }

  updateById(id, params) {
    return firstValueFrom(this.http.put(`${url}/updateById.php?id=${id}`, params))
  }

  deleteById(id) {
    return firstValueFrom(this.http.delete(`${url}/deleteById.php?id=${id}`))
  }

}

import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

let url = 'FieldServiceMobile/team';

@Injectable({
  providedIn: 'root'
})
export class TeamsService {

  constructor(private http: HttpClient) { }

  getByWorkOrderId(workOrderId) {
    return firstValueFrom(this.http.get(`${url}/getByWorkOrderId.php?workOrderId=${workOrderId}`))
  }

  getByFsId(fsId) {
    return firstValueFrom(this.http.get(`${url}/getByFsId.php?fs_det_id=${fsId}`))
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

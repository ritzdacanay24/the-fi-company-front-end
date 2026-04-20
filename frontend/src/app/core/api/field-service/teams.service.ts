import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

const teamV2Url = 'apiV2/team';

@Injectable({
  providedIn: 'root'
})
export class TeamsService {

  constructor(private http: HttpClient) { }

  getByWorkOrderId(workOrderId) {
    return firstValueFrom(this.http.get(`${teamV2Url}/byWorkOrderId?workOrderId=${workOrderId}`))
  }

  getByFsId(fsId) {
    return firstValueFrom(this.http.get(`${teamV2Url}/byFsId?fs_det_id=${fsId}`))
  }

  getById(id) {
    return firstValueFrom(this.http.get(`${teamV2Url}/${id}`))
  }

  updateById(id, params) {
    return firstValueFrom(this.http.put(`${teamV2Url}/${id}`, params))
  }

  deleteById(id) {
    return firstValueFrom(this.http.delete(`${teamV2Url}/${id}`))
  }

  create(params) {
    return firstValueFrom(this.http.post(`${teamV2Url}`, params))
  }

}

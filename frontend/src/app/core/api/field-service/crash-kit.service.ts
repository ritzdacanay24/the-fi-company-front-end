import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

const url = 'apiV2/crash-kit';

@Injectable({
  providedIn: 'root'
})
export class CrashKitService {

  constructor(private http: HttpClient) { }

  getByPartNumber(partNumber: string) {
    return firstValueFrom(this.http.get(`${url}/partSearch?partNumber=${partNumber}`));
  }

  getByWorkOrderId(workOrderId: string | number) {
    return firstValueFrom(this.http.get(`${url}/byWorkOrderId?workOrderId=${workOrderId}`));
  }

  getById(id: string | number) {
    return firstValueFrom(this.http.get(`${url}/${id}`));
  }

  updateById(id: string | number, params: Record<string, unknown>) {
    return firstValueFrom(this.http.put(`${url}/${id}`, params));
  }

  deleteById(id: string | number) {
    return firstValueFrom(this.http.delete(`${url}/${id}`));
  }

  create(params: Record<string, unknown>) {
    return firstValueFrom(this.http.post(`${url}`, params));
  }

}

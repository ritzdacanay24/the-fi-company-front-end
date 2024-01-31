import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/work-order';

@Injectable({
  providedIn: 'root'
})
export class WorkOrderService extends DataService<any>  {

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

  getAllRequests(selectedViewType: string, dateFrom: string, dateTo: string, isAll = false) {
    return firstValueFrom(this.http.get(`${url}/getAll.php?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`))
  }


}

import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

let url = 'FieldServiceMobile';

@Injectable({
  providedIn: 'root'
})
export class FieldServiceMobileService {

  constructor(private http: HttpClient) { }

  /**events */
  getEventViewByWorkOrderId(workOrderId) {
    return firstValueFrom(this.http.get(`${url}/event/getEventViewByWorkOrderId.php?workOrderId=${workOrderId}`))
  }

  /**events */
  getEventByWorkOrderId(workOrderId) {
    return firstValueFrom(this.http.get(`${url}/event/getEventByWorkOrderId.php?workOrderId=${workOrderId}`))
  }
  getEventById(id) {
    return firstValueFrom(this.http.get(`${url}/event/getEventById.php?id=${id}`))
  }
  getEventType() {
    return firstValueFrom(this.http.get(`${url}/event/getEventType.php`))
  }
  updateEventById(id, params) {
    return firstValueFrom(this.http.put(`${url}/event/updateEventById.php?id=${id}`, params))
  }
  deleteEventById(id) {
    return firstValueFrom(this.http.delete(`${url}/event/deleteEventById.php?id=${id}`))
  }
  createEvent(params) {
    return firstValueFrom(this.http.post(`${url}/event/createEvent.php`, params))
  }

}

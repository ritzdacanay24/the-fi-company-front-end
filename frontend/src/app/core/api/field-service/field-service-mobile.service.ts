import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

const eventV2Url = 'apiV2/event';
const ticketEventV2Url = 'apiV2/ticket-event';

@Injectable({
  providedIn: 'root'
})
export class FieldServiceMobileService {

  constructor(private http: HttpClient) { }

  /**events */
  getEventViewByWorkOrderId(workOrderId) {
    return firstValueFrom(this.http.get(`apiV2/event/getEventViewByWorkOrderId?workOrderId=${workOrderId}`))
  }

  /**events */
  getEventByWorkOrderId(workOrderId) {
    return firstValueFrom(this.http.get(`${eventV2Url}/find?workOrderId=${workOrderId}`))
  }
  getEventById(id) {
    return firstValueFrom(this.http.get(`${eventV2Url}/${id}`))
  }
  getEventType() {
    return firstValueFrom(this.http.get(`${ticketEventV2Url}/active`))
  }
  updateEventById(id, params) {
    return firstValueFrom(this.http.put(`${eventV2Url}/${id}`, params))
  }
  deleteEventById(id) {
    return firstValueFrom(this.http.delete(`${eventV2Url}/${id}`))
  }
  createEvent(params) {
    return firstValueFrom(this.http.post(`${eventV2Url}`, params))
  }

}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/ticket-event';

@Injectable({
  providedIn: 'root'
})
export class TicketEventService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }


}

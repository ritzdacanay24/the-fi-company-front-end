import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/service-type';

@Injectable({
  providedIn: 'root'
})
export class ServiceTypeService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }
}

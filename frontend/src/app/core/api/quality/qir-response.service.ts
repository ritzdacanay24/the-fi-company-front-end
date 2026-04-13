import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'Quality/qir-response';

@Injectable({
  providedIn: 'root'
})
export class QirResponseService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

}

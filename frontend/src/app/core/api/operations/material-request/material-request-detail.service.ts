import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';

let url = 'operations/material-request-detail';

@Injectable({
  providedIn: 'root'
})
export class MaterialRequestDetailService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

}

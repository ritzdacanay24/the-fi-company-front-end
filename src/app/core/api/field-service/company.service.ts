import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/company';

@Injectable({
  providedIn: 'root'
})
export class CompanyService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

}

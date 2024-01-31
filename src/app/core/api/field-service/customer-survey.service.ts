import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/customer-survey';

@Injectable({
  providedIn: 'root'
})
export class CustomerSurveyService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }
}

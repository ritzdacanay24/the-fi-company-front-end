import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/status-category';

@Injectable({
  providedIn: 'root'
})
export class StatusCategoryService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }


}

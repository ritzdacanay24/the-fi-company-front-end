import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/platform';

@Injectable({
  providedIn: 'root'
})
export class PlatformService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }


}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/setting';

@Injectable({
  providedIn: 'root'
})
export class SettingService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }


}

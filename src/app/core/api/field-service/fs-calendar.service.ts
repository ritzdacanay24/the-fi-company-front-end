import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/fs_calendar';

@Injectable({
  providedIn: 'root'
})
export class FsCalendarService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }
}

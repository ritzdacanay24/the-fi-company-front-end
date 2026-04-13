import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'FieldServiceMobile/team';

@Injectable({
  providedIn: 'root'
})
export class TeamService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }
}

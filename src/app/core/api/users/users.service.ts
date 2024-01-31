import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';

let url = 'users';

@Injectable({
  providedIn: 'root'
})
export class UserService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }
}

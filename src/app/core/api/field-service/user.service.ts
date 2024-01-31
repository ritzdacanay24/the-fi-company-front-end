import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';

let url = 'FieldServiceMobile/user';

@Injectable({
  providedIn: 'root'
})
export class UserService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getUserWithTechRate() {
    return firstValueFrom(this.http.get(`${url}/getUserWithTechRate.php`))
  }

  searchUser(q: string): Observable<any> {
    let apiURL = `${url}/searchUser?text=${q}`;
    return this.http.get(apiURL)
  }

}

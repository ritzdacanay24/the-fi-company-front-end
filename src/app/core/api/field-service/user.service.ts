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
  getUserWithTechRateById(id) {
    return firstValueFrom(this.http.get(`${url}/getUserWithTechRateById.php?id=${id}`))
  }

  searchUser(q: string): Observable<any> {
    let apiURL = `${url}/searchUser?text=${q}`;
    return this.http.get(apiURL)
  }

  public resetPassword(params) {
    return firstValueFrom(this.http.post(`/Auth/ResetPassword/resetPassword`, params))
  }

  public register(params){
    return firstValueFrom(this.http.post(`/Auth/Registration/createAccount`, params))
  }


}

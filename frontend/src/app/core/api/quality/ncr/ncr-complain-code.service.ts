import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';

let url = 'Quality/ncr/ncr-complaint-code';

@Injectable({
  providedIn: 'root'
})
export class NcrComplainCodeService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

}

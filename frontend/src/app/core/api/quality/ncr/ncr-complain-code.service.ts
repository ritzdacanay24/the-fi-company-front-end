import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

const url = 'apiV2/ncr/complaint-codes';

@Injectable({
  providedIn: 'root'
})
export class NcrComplainCodeService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  override getAll = async (): Promise<any[]> =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getAll`));

}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'operations/physcial-inventory';

@Injectable({
  providedIn: 'root'
})
export class PhyscialInventoryService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }

  getTags = async () =>
    await firstValueFrom(this.http.get<any[]>(`https://dashboard.eye-fi.com/server/Api/PhysicalInventory/inventory_tags`));

}

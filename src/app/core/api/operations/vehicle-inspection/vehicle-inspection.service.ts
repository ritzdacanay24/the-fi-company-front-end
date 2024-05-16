import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';

let url = 'operations/vehicle-inspection';

@Injectable({
  providedIn: 'root'
})
export class VehicleInspectionService extends DataService<any> {

  constructor(http: HttpClient) {
    super(url, http);
  }


  getList = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList`));


  async _create(params: any) {
    return await firstValueFrom(this.http.put<any>(`/VehicleInspection/index`, params));
  }


  async _searchById(id: number) {
    return await firstValueFrom(this.http.get<any>(`/VehicleInspection/index?searchById=${id}`));
  }


}

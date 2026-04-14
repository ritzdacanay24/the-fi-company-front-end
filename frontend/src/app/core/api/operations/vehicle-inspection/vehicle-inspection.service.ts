import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../../DataService";
import { firstValueFrom } from "rxjs";

const url = "apiV2/vehicle-inspection";
const legacyUrl = "operations/vehicle-inspection";

@Injectable({
  providedIn: "root",
})
export class VehicleInspectionService extends DataService<any> {
  constructor(http: HttpClient) {
    super(legacyUrl, http);
  }

  getList = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/getList`));

  async _create(params: any) {
    return await firstValueFrom(
      this.http.put<any>(`${url}/index`, params)
    );
  }

  async _searchById(id: number) {
    return await firstValueFrom(
      this.http.get<any>(`${url}/index?searchById=${id}`)
    );
  }

  async saveDetailById(id: number, params) {
    return await firstValueFrom(
      this.http.put<any>(
        `${url}/index?saveDetailById=${id}`,
        params
      )
    );
  }

  async getDetaliById(id: number) {
    return await firstValueFrom(
      this.http.get<any>(`${url}/index?getDetaliById=${id}`)
    );
  }

  
}

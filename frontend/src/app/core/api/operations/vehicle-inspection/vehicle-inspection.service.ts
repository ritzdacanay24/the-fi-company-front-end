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
    return await firstValueFrom(this.http.post<any>(`${url}/create`, params));
  }

  async _searchById(id: number) {
    return await firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));
  }

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<any>(`${url}/deleteById?id=${id}`));
    return { message: 'Successfully deleted' };
  };

  async saveDetailById(id: number, params) {
    return await firstValueFrom(this.http.put<any>(`${url}/saveDetailById?id=${id}`, params));
  }

  async getDetaliById(id: number) {
    return await firstValueFrom(this.http.get<any>(`${url}/getDetaliById?id=${id}`));
  }

  
}

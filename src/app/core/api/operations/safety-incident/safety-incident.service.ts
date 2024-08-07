import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../../DataService";
import { firstValueFrom } from "rxjs";

let url = "operations/safety-incident";

@Injectable({
  providedIn: "root",
})
export class SafetyIncidentService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async (
    selectedViewType: string,
    dateFrom: string,
    dateTo: string,
    isAll = false
  ) =>
    await firstValueFrom(
      this.http.get<any[]>(
        `${url}/getList?selectedViewType=${selectedViewType}&dateFrom=${dateFrom}&dateTo=${dateTo}&isAll=${isAll}`
      )
    );

  async _create(params: any) {
    return await firstValueFrom(
      this.http.put<any>(`/safety-incident/index`, params)
    );
  }

  async _searchById(id: number) {
    return await firstValueFrom(
      this.http.get<any>(`/safety-incident/index?searchById=${id}`)
    );
  }
}

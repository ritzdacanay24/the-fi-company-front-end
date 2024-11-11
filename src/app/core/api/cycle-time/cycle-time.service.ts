import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { firstValueFrom } from "rxjs";

let url = "cycle-time";

@Injectable({
  providedIn: "root",
})
export class CycleTimeService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/cycle-time-list`));

  getAvailabilityList = async () =>
    await firstValueFrom(this.http.get<any[]>(`${url}/availability-list`));

  createAvailability = async (params) =>
    await firstValueFrom(
      this.http.post<any>(`${url}/availability-create`, params)
    );

  getCycleTimes = async () =>
    await firstValueFrom(
      this.http.get<any>(`/CycleTimes/index?getShippingCycleTimes=1`)
    );
}

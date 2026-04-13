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

  cycleTimeChart = async (typeOfView, dateFrom, dateTo) =>
    await firstValueFrom(
      this.http.get<any>(
        `${url}/cycle-time-chart?typeOfView=${typeOfView}&dateFrom=${dateFrom}&dateTo=${dateTo}`
      )
    );

  getCycleTimes = async () =>
    await firstValueFrom(
      this.http.get<any>(`/CycleTimes/index?getProductionCycleTimes=1`)
    );

  async getCycleTimesDaily(dateFrom: string, dateTo: string) {
    return await firstValueFrom(
      this.http.get<any>(
        `/CycleTimes/index?cycleTimesDaily=1&dateFrom=${dateFrom}&dateTo=${dateTo}`
      )
    );
  }
}

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
}

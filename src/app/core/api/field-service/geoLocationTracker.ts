import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { firstValueFrom } from "rxjs";

let url = "geoLocationTracker";

@Injectable({
  providedIn: "root",
})
export class GeoLocationTrackerService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  /**events */
  getGeoLocationTracker(dateFrom, dateTo) {
    return firstValueFrom(this.http.get(`${url}/getGeoLocationTracker.php?dateFrom=${dateFrom}&dateTo=${dateTo}`));
  }
}

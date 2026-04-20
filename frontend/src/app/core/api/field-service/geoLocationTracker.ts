import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { firstValueFrom } from "rxjs";

const geoLocationTrackerV2Url = 'apiV2/geo-location-tracker';

@Injectable({
  providedIn: "root",
})
export class GeoLocationTrackerService extends DataService<any> {
  constructor(http: HttpClient) {
    super(geoLocationTrackerV2Url, http);
  }

  /**events */
  getGeoLocationTracker(dateFrom, dateTo) {
    return firstValueFrom(
      this.http.get(`${geoLocationTrackerV2Url}/getGeoLocationTracker?dateFrom=${dateFrom}&dateTo=${dateTo}`)
    );
  }
}

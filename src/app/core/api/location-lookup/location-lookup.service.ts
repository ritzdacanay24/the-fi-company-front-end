import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { firstValueFrom } from "rxjs";

let url = "location-lookup";

@Injectable({
  providedIn: "root",
})
export class LocationLookupService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  // Read details
  getLocation(location: string) {
    return firstValueFrom(
      this.http.get<any>(`${url}/location-lookup?location=${location}`)
    );
  }
}

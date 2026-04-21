import { Injectable } from "@angular/core";
import { firstValueFrom, Observable } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";

const url = "apiV2/address-search";

@Injectable({
  providedIn: "root",
})
export class AddressSearch extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  searchAddress(q): Observable<any> {
    return this.http.get<any>(`${url}/addressSearch?q=${encodeURIComponent(q || "")}`);
  }

  searchNearbyAirport({ q, lat, lon, radius, limit, categorySet }: any) {
    return firstValueFrom(
      this.http.get<any>(
        `${url}/airportSearch?q=${encodeURIComponent(q || "")}&categorySet=${encodeURIComponent(categorySet || "")}&lat=${encodeURIComponent(lat || "")}&lon=${encodeURIComponent(lon || "")}&radius=${encodeURIComponent(radius || "")}&limit=${encodeURIComponent(limit || "")}`
      )
    );
  }
}

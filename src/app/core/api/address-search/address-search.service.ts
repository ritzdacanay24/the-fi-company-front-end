import { Injectable } from "@angular/core";
import { firstValueFrom, Observable } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";

let url = "";

let GOOGLE_SEARCH_API = "G5yW6WfoOA8pAl6MAwaW2Xgw0AsnXyoA";

@Injectable({
  providedIn: "root",
})
export class AddressSearch extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  searchAddress(q): Observable<any> {
    return this.http.get<any>(
      `https://dashboard.eye-fi.com/api/addressSearch/addressSearch.php?q=${q}`
    );
  }

  searchNearbyAirport({ q, lat, lon, radius, limit, categorySet }: any) {
    return firstValueFrom(
      this.http.get<any>(
        decodeURIComponent(
          `https://dashboard.eye-fi.com/server/Api/addressSearch/airportSearch.php?q=${q}&categorySet=${categorySet}&lat=${lat}&lon=${lon}&radius=${radius}&limit=${limit}`
        )
      )
    );
  }
}

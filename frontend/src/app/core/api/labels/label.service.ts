import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

const itemSearchApiV2Url = 'apiV2/item-search';

@Injectable({
  providedIn: 'root'
})
export class LabelService {
  constructor(private http: HttpClient) { }

  // Read details
  getItemInfo(itemNumber: string, typeOfItemSearch?: string): Observable<any> {
    const searchType = typeOfItemSearch || 'partNumber';
    return this.http.get<any>(
      `apiV2/item-search/read-single?readSingle=${encodeURIComponent(itemNumber)}&typeOfItemSearch=${encodeURIComponent(searchType)}`,
    );
  }

  // Read details
  getCustomerInfo(partNumber: string) {
    return this.http.get<any>(
      `${itemSearchApiV2Url}/customer-part-search?partNumber=${encodeURIComponent(partNumber)}`,
    ).toPromise();
  }

  getLocationByRange(locationStart: string, locationEnd: string) {
    return this.http.get<any>(`/Locations/getLocations?locationStart=${locationStart}&locationEnd=${locationEnd}`).toPromise()
  }
}

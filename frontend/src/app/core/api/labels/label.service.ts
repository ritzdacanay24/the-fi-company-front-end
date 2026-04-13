import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LabelService {
  constructor(private http: HttpClient) { }

  // Read details
  getItemInfo(itemNumber: string, typeOfItemSearch?: string): Observable<any> {
    return this.http.get<any>(`/item_search/item_search?readSingle=${itemNumber}&typeOfItemSearch=${typeOfItemSearch}`);
  }

  // Read details
  getCustomerInfo(partNumber: string) {
    return this.http.get<any>(`/item_search/customer_part_search?partNumber=${partNumber}`).toPromise();
  }

  getLocationByRange(locationStart: string, locationEnd: string) {
    return this.http.get<any>(`/Locations/getLocations?locationStart=${locationStart}&locationEnd=${locationEnd}`).toPromise()
  }
}

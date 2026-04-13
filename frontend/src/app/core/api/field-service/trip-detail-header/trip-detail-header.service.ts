import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../../DataService";
import { firstValueFrom } from "rxjs";

let url = "FieldServiceMobile/trip-detail-header";

@Injectable({
  providedIn: "root",
})
export class TripDetailHeaderService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  getByGroup() {
    return firstValueFrom(this.http.get(`${url}/getByGroup.php`));
  }

  multipleGroups(id) {
    return firstValueFrom(this.http.get(`${url}/multipleGroups.php?id=${id}`));
  }
}

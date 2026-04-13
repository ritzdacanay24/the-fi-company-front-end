import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../../DataService";
import { firstValueFrom } from "rxjs";

let url = "FieldServiceMobile/trip-detail";

@Injectable({
  providedIn: "root",
})
export class TripDetailService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  emailTripDetails(fsId, params) {
    return firstValueFrom(
      this.http.put(`${url}/emailTripDetails.php?fsId=${fsId}`, params)
    );
  }

  findByGroupFsId(id) {
    return firstValueFrom(this.http.get(`${url}/findByGroupFsId.php?id=${id}`));
  }

  findByFsId(id) {
    return firstValueFrom(this.http.get(`${url}/findByFsId.php?id=${id}`));
  }

  
}

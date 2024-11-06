import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { AuthenticationService } from "@app/core/services/auth.service";

let url = "timeTracker";

@Injectable({
  providedIn: "root",
})
export class TimeTrackerService extends DataService<any> {
  constructor(
    http: HttpClient,
    private authenticationService: AuthenticationService
  ) {
    super(url, http);
  }
}

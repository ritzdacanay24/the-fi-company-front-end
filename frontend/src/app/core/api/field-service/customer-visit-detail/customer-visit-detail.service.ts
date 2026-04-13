import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../../DataService";

let url = "customer-visit-detail";

@Injectable({
  providedIn: "root",
})
export class CustomerVisitDetailService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }
}

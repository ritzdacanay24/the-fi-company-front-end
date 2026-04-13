import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../../DataService";

let url = "customer-visit";

@Injectable({
  providedIn: "root",
})
export class CustomerVisitService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }
}

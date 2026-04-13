import { Injectable } from "@angular/core";
import { Observable, firstValueFrom } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { DataService } from "./DataService";

let url = "/trackData.php";

@Injectable({
  providedIn: "root",
})
export class LogService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  async getList() {
    return await firstValueFrom(this.http.get(`${url}`));
  }
}

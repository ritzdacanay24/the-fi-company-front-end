import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { firstValueFrom } from "rxjs";

let url = "access";

@Injectable({
  providedIn: "root",
})
export class AccessService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  getAccess = async (user_id, page_name) =>
    await firstValueFrom(
      this.http.get<any[]>(
        `${url}/access?user_id=${user_id}&page_name=${page_name}`
      )
    );
}

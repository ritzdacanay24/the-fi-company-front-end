import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { firstValueFrom } from "rxjs";

let url = "page-access";

@Injectable({
  providedIn: "root",
})
export class PageAccessService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  getByUserId = async (user_id) =>
    await firstValueFrom(
      this.http.get<any[]>(`${url}/getByUserId?user_id=${user_id}`)
    );

  requestAccess = async (user_id, menu_id) =>
    await firstValueFrom(
      this.http.get<any[]>(
        `${url}/request-access?user_id=${user_id}&menu_id=${menu_id}`
      )
    );
}

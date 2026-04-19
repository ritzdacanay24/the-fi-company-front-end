import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { firstValueFrom } from "rxjs";

let url = "page-access";
const pageAccessV2Url = 'apiV2/page-access';

@Injectable({
  providedIn: "root",
})
export class PageAccessService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  getByUserId = async (user_id) =>
    await firstValueFrom(
      this.http.get<any[]>(`${pageAccessV2Url}/getByUserId?user_id=${user_id}`)
    );

  requestAccess = async (user_id, menu_id) =>
    await firstValueFrom(
      this.http.post<any>(
        `${pageAccessV2Url}/requestAccess?user_id=${user_id}&menu_id=${menu_id}`,
        {}
      )
    );

  override create = (body: { user_id: number; menu_id: number }) =>
    firstValueFrom(this.http.post<any>(pageAccessV2Url, body));
}

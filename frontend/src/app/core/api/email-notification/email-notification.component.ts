import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { firstValueFrom } from "rxjs";

let url = "email-notification";
const v2Url = "apiV2/email-notification";

@Injectable({
  providedIn: "root",
})
export class EmailNotificationService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  getList = () => firstValueFrom(this.http.get<any[]>(`${v2Url}/getList`));

  override getAll = () => firstValueFrom(this.http.get<any[]>(`${v2Url}/getList`));

  override find = (params: any) => {
    const qs = new URLSearchParams(params).toString();
    return firstValueFrom(this.http.get<any[]>(`${v2Url}/find${qs ? '?' + qs : ''}`));
  };

  override getById = (id: number) => firstValueFrom(this.http.get<any>(`${v2Url}/${id}`));

  override create = (body: any) => firstValueFrom(this.http.post<any>(v2Url, body));

  override update = (id: number, params: any) =>
    firstValueFrom(this.http.put<any>(`${v2Url}/${id}`, params));

  deleteById = (id: number) =>
    firstValueFrom(this.http.delete<any>(`${v2Url}/${id}`));

  getOptions = () => firstValueFrom(this.http.get<any[]>(`${v2Url}/getOptions`));
}

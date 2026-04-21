import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { firstValueFrom } from "rxjs";
import { environment } from "src/environments/environment";

let url = "user";
const usersV2Url = "apiV2/users";

@Injectable({
  providedIn: "root",
})
export class NewUserService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  private readonly legacyApiBaseUrl = environment.legacyApiBaseUrl.replace(/\/+$/, '');

  override getById = async (id: number) =>
    firstValueFrom(this.http.get<any>(`${usersV2Url}/${id}`));

  override update = async (id: string | number, params: any) =>
    firstValueFrom(this.http.patch<any>(`${usersV2Url}/${id}`, params));

  uploadfile(id, file: any) {
    return this.http
      .post(
        `${this.legacyApiBaseUrl}/users/addPhoto.php?id=${id}`,
        file
      )
      .toPromise();
  }

  addPhoto;
}

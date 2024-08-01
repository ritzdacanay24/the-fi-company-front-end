import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";

let url = "user";

@Injectable({
  providedIn: "root",
})
export class NewUserService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  uploadfile(id, file: any) {
    return this.http
      .post(
        `https://dashboard.eye-fi.com/server/Api/users/addPhoto.php?id=${id}`,
        file
      )
      .toPromise();
  }

  addPhoto;
}

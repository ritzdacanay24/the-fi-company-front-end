import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { firstValueFrom } from "rxjs";

let url = "auth/Login/twostep";

@Injectable({
  providedIn: "root",
})
export class TwostepService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  twoStepGenerateCode = async (params) =>
    await firstValueFrom(this.http.post<any>(`${url}/twostep`, params));

  validatetwoStepCode = async (params) =>
    await firstValueFrom(
      this.http.post<any>(`${url}/validatetwoStepCode`, params)
    );

  validatetwoStepCodeAndPassCode = async (params) =>
    await firstValueFrom(
      this.http.post<any>(`${url}/validatetwoStepCodeAndPassCode`, params)
    );

  isTwostepEnabled = async () =>
    await firstValueFrom(
      this.http.get<any>(`${url}/isTwostepEnabled`)
    );
}

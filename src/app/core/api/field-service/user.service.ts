import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { Observable, firstValueFrom } from "rxjs";
import { queryString } from "src/assets/js/util/queryString";

let url = "FieldServiceMobile/user";

@Injectable({
  providedIn: "root",
})
export class UserService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  getUserWithTechRate() {
    return firstValueFrom(this.http.get(`${url}/getUserWithTechRate.php`));
  }
  getUserWithTechRateById(id) {
    return firstValueFrom(
      this.http.get(`${url}/getUserWithTechRateById.php?id=${id}`)
    );
  }

  searchUser(q: string): Observable<any> {
    let apiURL = `${url}/searchUser?text=${q}`;
    return this.http.get(apiURL);
  }

  searchUserV1(q: string): Observable<any> {
    let apiURL = `${url}/searchUserV1?text=${q}`;
    return this.http.get(apiURL);
  }

  public resetPassword(params) {
    return firstValueFrom(
      this.http.post(`/Auth/ResetPassword/resetPassword`, params)
    );
  }

  public register(params) {
    return firstValueFrom(
      this.http.post(`/Auth/Registration/createAccount`, params)
    );
  }

  public async getUserTree() {
    let data = await firstValueFrom(this.http.get(`${url}/find.php?active=1`));
    return formatData(data);
  }

  public async getOrgchart(params) {
    const result = queryString(params);
    return await firstValueFrom(this.http.get(`${url}/orgchart.php${result}`));
  }
  public async hasSubordinates(id) {
    return await firstValueFrom(this.http.get(`${url}/hasSubordinates.php?id=${id}`));
  }

  // Org Chart Token Methods
  public generateOrgChartToken(params: { password?: string; expiryHours?: number; userId?: number }): Observable<any> {
    return this.http.post('org-chart-token/index.php?mode=generate', params);
  }

  public validateOrgChartToken(token: string, password?: string): Observable<any> {
    const safeToken = encodeURIComponent(token);
    const safePassword = password != null ? encodeURIComponent(password) : null;
    const params = safePassword ? `mode=validate&token=${safeToken}&password=${safePassword}` : `mode=validate&token=${safeToken}`;
    return this.http.get(`org-chart-token/index.php?${params}`);
  }

  public revokeOrgChartToken(tokenId: number): Observable<any> {
    return this.http.post('org-chart-token/index.php?mode=revoke', { tokenId });
  }

  public listOrgChartTokens(): Observable<any> {
    return this.http.get('org-chart-token/index.php?mode=list');
  }

  
}

function formatData(data) {
  function addChild(obj) {
    // get childs and further retrieve its childs with map recursively
    let subItems = data.filter((a: { parentId: any; }) => a.parentId == obj.id).map(addChild);

    // if childs are found then add childs in object
    if (subItems.length > 0) {
      return { ...obj, subItems };
    }

    // if no child found then return object only
    return { ...obj };
  }

  return data.filter((a) => a.parentId == null).map(addChild);
}

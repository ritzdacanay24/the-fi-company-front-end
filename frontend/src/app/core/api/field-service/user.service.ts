import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { Observable, firstValueFrom } from "rxjs";
import { queryString } from "src/assets/js/util/queryString";

let url = "FieldServiceMobile/user";
const usersV2Url = 'apiV2/users';
const orgChartUrl = 'apiV2/org-chart';
const orgChartTokenUrl = 'apiV2/org-chart-token';

@Injectable({
  providedIn: "root",
})
export class UserService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  getList(active?: number) {
    const params = active !== undefined ? `?active=${active}` : '';
    return firstValueFrom(this.http.get<any[]>(`${usersV2Url}/getList${params}`));
  }

  override getById = async (id: number) =>
    firstValueFrom(this.http.get<any>(`${usersV2Url}/${id}`));

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

  public resetPassword(params: { email: string; password: string }) {
    return firstValueFrom(
      this.http.post(`${usersV2Url}/reset-password`, {
        email: params.email,
        newPassword: params.password,
      })
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
    const rows = await firstValueFrom(this.http.get<any[]>(`${orgChartUrl}/orgchart${result}`));
    return normalizeOrgChartRows(rows);
  }
  public async hasSubordinates(id) {
    return await firstValueFrom(this.http.get(`${orgChartUrl}/hasSubordinates?id=${id}`));
  }

  // Org Chart Token Methods
  public generateOrgChartToken(params: { password?: string; expiryHours?: number; userId?: number }): Observable<any> {
    return this.http.post(`${orgChartTokenUrl}/generate`, params);
  }

  public validateOrgChartToken(token: string, password?: string): Observable<any> {
    const safeToken = encodeURIComponent(token);
    const safePassword = password != null ? encodeURIComponent(password) : null;
    const params = safePassword ? `mode=validate&token=${safeToken}&password=${safePassword}` : `mode=validate&token=${safeToken}`;
    return this.http.get(`${orgChartTokenUrl}/validate?${safePassword ? `token=${safeToken}&password=${safePassword}` : `token=${safeToken}`}`);
  }

  public revokeOrgChartToken(tokenId: number): Observable<any> {
    return this.http.post(`${orgChartTokenUrl}/revoke`, { tokenId });
  }

  public listOrgChartTokens(): Observable<any> {
    return this.http.get(`${orgChartTokenUrl}/list`);
  }

  
}

function normalizeOrgChartRows(rows: any[]): any[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    const rawId = row?.id ?? row?.ID;
    const rawParentId = row?.parentId ?? row?.parentID ?? row?.parent_id ?? null;

    const id = toNullableNumber(rawId);
    const parentId = toNullableNumber(rawParentId);

    return {
      ...row,
      id,
      parentId,
    };
  });
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

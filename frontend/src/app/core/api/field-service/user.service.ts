import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../DataService";
import { Observable, firstValueFrom } from "rxjs";
import { queryString } from "src/assets/js/util/queryString";

const usersV2Url = 'apiV2/users';
const orgChartUrl = 'apiV2/org-chart';
const orgChartTokenUrl = 'apiV2/org-chart-token';

@Injectable({
  providedIn: "root",
})
export class UserService extends DataService<any> {
  constructor(http: HttpClient) {
    super(usersV2Url, http);
  }

  getList(active?: number) {
    const params = active !== undefined ? `?active=${active}` : '';
    return firstValueFrom(this.http.get<any[]>(`${usersV2Url}/getList${params}`));
  }

  override getById = async (id: number) =>
    firstValueFrom(this.http.get<any>(`${usersV2Url}/${id}`));

  override update = async (id: string | number, params: any) =>
    firstValueFrom(this.http.patch<any>(`${usersV2Url}/${id}`, params));

  override find = async (params: Partial<any>): Promise<any[]> => {
    const result = queryString(params);
    return firstValueFrom(this.http.get<any[]>(`${usersV2Url}/find${result}`));
  };

  getUserWithTechRate() {
    return firstValueFrom(this.http.get(`${usersV2Url}/getUserWithTechRate`));
  }
  getUserWithTechRateById(id) {
    return firstValueFrom(
      this.http.get(`${usersV2Url}/getUserWithTechRateById?id=${id}`)
    );
  }

  searchUser(q: string): Observable<any> {
    return this.http.get(`${usersV2Url}/search?text=${encodeURIComponent(q || '')}`);
  }

  searchUserV1(q: string): Observable<any> {
    return this.http.get(`${usersV2Url}/search?text=${encodeURIComponent(q || '')}`);
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
    let data = await firstValueFrom(this.http.get(`${usersV2Url}/find?active=1`));
    return formatData(data);
  }

  public async getOrgchart(params) {
    const result = queryString(params);
    const rows = await firstValueFrom(this.http.get<any[]>(`${orgChartUrl}/orgchart${result}`));
    return normalizeOrgChartRows(rows);
  }

  public async updateOrgChartPosition(
    id: number,
    payload: { parentId?: number | null; beforeId?: number | null; afterId?: number | null },
  ) {
    return firstValueFrom(this.http.patch<any>(`${usersV2Url}/${id}/org-chart-position`, payload));
  }
  public async hasSubordinates(id) {
    return await firstValueFrom(this.http.get(`${orgChartUrl}/hasSubordinates?id=${id}`));
  }

  public async createOpenPosition(payload: {
    title: string;
    reportsToUserId?: number | null;
    department?: string | null;
    city?: string | null;
    state?: string | null;
    createdBy?: number | null;
  }) {
    return firstValueFrom(this.http.post<any>(`${orgChartUrl}/open-positions`, payload));
  }

  public async updateOpenPosition(
    id: number,
    payload: {
      title?: string;
      reportsToUserId?: number | null;
      department?: string | null;
      city?: string | null;
      state?: string | null;
      active?: number;
      status?: 'open' | 'filled' | 'closed';
      filledByUserId?: number | null;
    },
  ) {
    return firstValueFrom(this.http.patch<any>(`${orgChartUrl}/open-positions/${id}`, payload));
  }

  public async fillOpenPosition(id: number, payload: { filledByUserId?: number | null } = {}) {
    return firstValueFrom(this.http.post<any>(`${orgChartUrl}/open-positions/${id}/fill`, payload));
  }

  public async closeOpenPosition(id: number) {
    return firstValueFrom(this.http.post<any>(`${orgChartUrl}/open-positions/${id}/close`, {}));
  }

  public async listOpenPositions() {
    return firstValueFrom(this.http.get<any[]>(`${orgChartUrl}/open-positions`));
  }

  // Org Chart Token Methods
  public generateOrgChartToken(params: { password?: string; expiryHours?: number; userId?: number }): Observable<any> {
    return this.http.post(`${orgChartTokenUrl}/generate`, params);
  }

  public validateOrgChartToken(token: string, password?: string): Observable<any> {
    const safeToken = encodeURIComponent(token);
    const safePassword = password != null ? encodeURIComponent(password) : null;
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
      org_chart_order: toNullableNumber(row?.org_chart_order) ?? 0,
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

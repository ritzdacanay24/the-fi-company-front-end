import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../../DataService";
import { firstValueFrom } from "rxjs";
import { queryString } from "src/assets/js/util/queryString";

const url = "apiV2/vehicle";
const legacyUrl = "vehicle";

@Injectable({
  providedIn: "root",
})
export class VehicleService extends DataService<any> {
  constructor(http: HttpClient) {
    super(legacyUrl, http);
  }

  private toQueryString(params: Record<string, unknown>): string {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    return query ? `?${query}` : '';
  }

  getList = async (
    selectedViewType: string,
    dateFrom: string,
    dateTo: string,
    isAll = false
  ) => {
    const query = `selectedViewType=${encodeURIComponent(selectedViewType)}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}&isAll=${isAll}`;
    return await firstValueFrom(this.http.get<any[]>(`${url}/getList?${query}`));
  };

  override findOne = async (params: Partial<any>): Promise<any> => {
    return await firstValueFrom(this.http.get<any>(`${url}/findOne${this.toQueryString(params as Record<string, unknown>)}`));
  }

  override find = async (params: Partial<any>): Promise<any[]> => {
    return await firstValueFrom(this.http.get<any[]>(`${url}/find${this.toQueryString(params as Record<string, unknown>)}`));
  }

  override getAll = async (): Promise<any[]> => {
    return await firstValueFrom(this.http.get<any[]>(`${url}/getAll`));
  }

  override getById = async (id: number): Promise<any> => {
    return await firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));
  }

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(this.http.post<{ insertId: number }>(`${url}/create`, params));
    return { message: 'success', insertId: response.insertId };
  }

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<{ rowCount: number }>(`${url}/updateById?id=${id}`, params));
    return { message: 'success' };
  }

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<{ rowCount: number }>(`${url}/deleteById?id=${id}`));
    return { message: 'success' };
  }

  checkAnyFailures = async (license: string) =>
    await firstValueFrom(
      this.http.get<any[]>(`${url}/checkAnyFailures?license=${encodeURIComponent(license)}`)
    );
}

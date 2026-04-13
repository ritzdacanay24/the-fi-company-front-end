import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../../DataService";
import { firstValueFrom } from "rxjs";
import { environment } from "src/environments/environment";
import { queryString } from "src/assets/js/util/queryString";

let url = "vehicle";

@Injectable({
  providedIn: "root",
})
export class VehicleService extends DataService<any> {
  constructor(http: HttpClient) {
    super(url, http);
  }

  private get useV2(): boolean {
    return environment.useApiV2VehicleList;
  }

  private get apiV2VehicleBaseUrl(): string {
    return environment.vehicleApiBaseUrl || environment.apiV2BaseUrl;
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

    if (this.useV2) {
      return await firstValueFrom(this.http.get<any[]>(`${this.apiV2VehicleBaseUrl}/api/vehicle/getList?${query}`));
    }

    return await firstValueFrom(this.http.get<any[]>(`${url}/getList?${query}`));
  };

  override findOne = async (params: Partial<any>): Promise<any> => {
    if (this.useV2) {
      return await firstValueFrom(this.http.get<any>(`${this.apiV2VehicleBaseUrl}/api/vehicle/findOne${this.toQueryString(params as Record<string, unknown>)}`));
    }
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any>(`${url}/findOne.php${result}`));
  }

  override find = async (params: Partial<any>): Promise<any[]> => {
    if (this.useV2) {
      return await firstValueFrom(this.http.get<any[]>(`${this.apiV2VehicleBaseUrl}/api/vehicle/find${this.toQueryString(params as Record<string, unknown>)}`));
    }
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any[]>(`${url}/find.php${result}`));
  }

  override getAll = async (): Promise<any[]> => {
    if (this.useV2) {
      return await firstValueFrom(this.http.get<any[]>(`${this.apiV2VehicleBaseUrl}/api/vehicle/getAll`));
    }
    return await firstValueFrom(this.http.get<any[]>(`${url}/getAll.php`));
  }

  override getById = async (id: number): Promise<any> => {
    if (this.useV2) {
      return await firstValueFrom(this.http.get<any>(`${this.apiV2VehicleBaseUrl}/api/vehicle/getById?id=${id}`));
    }
    return await firstValueFrom(this.http.get<any>(`${url}/getById.php?id=${id}`));
  }

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    if (this.useV2) {
      const response = await firstValueFrom(this.http.post<{ insertId: number }>(`${this.apiV2VehicleBaseUrl}/api/vehicle/create`, params));
      return { message: 'success', insertId: response.insertId };
    }
    return await firstValueFrom(this.http.post<{ message: string; insertId?: number }>(`${url}/create.php`, params));
  }

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> => {
    if (this.useV2) {
      await firstValueFrom(this.http.put<{ rowCount: number }>(`${this.apiV2VehicleBaseUrl}/api/vehicle/updateById?id=${id}`, params));
      return { message: 'success' };
    }
    return await firstValueFrom(this.http.put<{ message: string }>(`${url}/updateById.php?id=${id}`, params));
  }

  override delete = async (id: number): Promise<{ message: string }> => {
    if (this.useV2) {
      await firstValueFrom(this.http.delete<{ rowCount: number }>(`${this.apiV2VehicleBaseUrl}/api/vehicle/deleteById?id=${id}`));
      return { message: 'success' };
    }
    return await firstValueFrom(this.http.delete<{ message: string }>(`${url}/deleteById.php?id=${id}`));
  }

  checkAnyFailures = async (license: string) =>
    await firstValueFrom(
      this.http.get<any[]>(`${url}/checkAnyFailures?license=${license}`)
    );
}

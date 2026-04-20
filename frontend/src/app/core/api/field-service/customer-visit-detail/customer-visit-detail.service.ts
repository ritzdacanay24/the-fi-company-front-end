import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../../DataService";
import { firstValueFrom } from "rxjs";

const customerVisitDetailV2Url = 'apiV2/customer-visit-detail';

@Injectable({
  providedIn: "root",
})
export class CustomerVisitDetailService extends DataService<any> {
  constructor(http: HttpClient) {
    super(customerVisitDetailV2Url, http);
  }

  override find = async (params: Partial<any>): Promise<any[]> => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const url = query ? `${customerVisitDetailV2Url}/find?${query}` : `${customerVisitDetailV2Url}/find`;
    return firstValueFrom(this.http.get<any[]>(url));
  };

  override getAll = async (): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>(`${customerVisitDetailV2Url}`));

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${customerVisitDetailV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<any> =>
    firstValueFrom(this.http.post<any>(`${customerVisitDetailV2Url}`, params));

  override update = async (id: string | number, params: Partial<any>): Promise<any> =>
    firstValueFrom(this.http.put<any>(`${customerVisitDetailV2Url}/${id}`, params));

  override delete = async (id: number): Promise<any> =>
    firstValueFrom(this.http.delete<any>(`${customerVisitDetailV2Url}/${id}`));
}

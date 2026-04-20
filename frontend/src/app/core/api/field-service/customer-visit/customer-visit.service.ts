import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../../DataService";
import { firstValueFrom } from "rxjs";

const customerVisitV2Url = 'apiV2/customer-visit';

@Injectable({
  providedIn: "root",
})
export class CustomerVisitService extends DataService<any> {
  constructor(http: HttpClient) {
    super(customerVisitV2Url, http);
  }

  override find = async (params: Partial<any>): Promise<any[]> => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const url = query ? `${customerVisitV2Url}/find?${query}` : `${customerVisitV2Url}/find`;
    return firstValueFrom(this.http.get<any[]>(url));
  };

  override getAll = async (): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>(`${customerVisitV2Url}`));

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${customerVisitV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<any> =>
    firstValueFrom(this.http.post<any>(`${customerVisitV2Url}`, params));

  override update = async (id: string | number, params: Partial<any>): Promise<any> =>
    firstValueFrom(this.http.put<any>(`${customerVisitV2Url}/${id}`, params));

  override delete = async (id: number): Promise<any> =>
    firstValueFrom(this.http.delete<any>(`${customerVisitV2Url}/${id}`));
}

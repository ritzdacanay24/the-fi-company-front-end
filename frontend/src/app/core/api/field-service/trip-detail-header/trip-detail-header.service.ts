import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../../DataService";
import { firstValueFrom } from "rxjs";

const tripDetailHeaderV2Url = 'apiV2/trip-detail-header';

@Injectable({
  providedIn: "root",
})
export class TripDetailHeaderService extends DataService<any> {
  constructor(http: HttpClient) {
    super(tripDetailHeaderV2Url, http);
  }

  override find = async (params: Partial<any>): Promise<any[]> => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const url = query ? `${tripDetailHeaderV2Url}/find?${query}` : `${tripDetailHeaderV2Url}/find`;
    return firstValueFrom(this.http.get<any[]>(url));
  };

  override getAll = async (): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>(`${tripDetailHeaderV2Url}`));

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${tripDetailHeaderV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<any> =>
    firstValueFrom(this.http.post<any>(`${tripDetailHeaderV2Url}`, params));

  override update = async (id: string | number, params: Partial<any>): Promise<any> =>
    firstValueFrom(this.http.put<any>(`${tripDetailHeaderV2Url}/${id}`, params));

  override delete = async (id: number): Promise<any> =>
    firstValueFrom(this.http.delete<any>(`${tripDetailHeaderV2Url}/${id}`));

  getByGroup() {
    return firstValueFrom(this.http.get(`${tripDetailHeaderV2Url}/getByGroup`));
  }

  multipleGroups(id: number) {
    const normalizedId = Number(id);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      throw new Error("multipleGroups requires a valid numeric fsId");
    }

    return firstValueFrom(
      this.http.get(`${tripDetailHeaderV2Url}/multipleGroups`, {
        params: { id: String(normalizedId) },
      })
    );
  }
}

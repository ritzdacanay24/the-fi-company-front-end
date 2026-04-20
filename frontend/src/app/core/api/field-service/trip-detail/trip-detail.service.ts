import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataService } from "../../DataService";
import { firstValueFrom } from "rxjs";

const tripDetailV2Url = 'apiV2/trip-detail';

@Injectable({
  providedIn: "root",
})
export class TripDetailService extends DataService<any> {
  constructor(http: HttpClient) {
    super(tripDetailV2Url, http);
  }

  override find = async (params: Partial<any>): Promise<any[]> => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const url = query ? `${tripDetailV2Url}/find?${query}` : `${tripDetailV2Url}/find`;
    return firstValueFrom(this.http.get<any[]>(url));
  };

  override getAll = async (): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>(`${tripDetailV2Url}`));

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${tripDetailV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<any> =>
    firstValueFrom(this.http.post<any>(`${tripDetailV2Url}`, params));

  override update = async (id: string | number, params: Partial<any>): Promise<any> =>
    firstValueFrom(this.http.put<any>(`${tripDetailV2Url}/${id}`, params));

  override delete = async (id: number): Promise<any> =>
    firstValueFrom(this.http.delete<any>(`${tripDetailV2Url}/${id}`));

  emailTripDetails(fsId, params) {
    return firstValueFrom(
      this.http.put(`${tripDetailV2Url}/emailTripDetails?fsId=${fsId}`, params)
    );
  }

  findByGroupFsId(id) {
    return firstValueFrom(this.http.get(`${tripDetailV2Url}/findByGroupFsId?id=${id}`));
  }

  findByFsId(id) {
    return firstValueFrom(this.http.get(`${tripDetailV2Url}/findByFsId?id=${id}`));
  }

  
}

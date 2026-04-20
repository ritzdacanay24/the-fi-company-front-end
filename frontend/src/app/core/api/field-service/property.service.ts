import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';

const propertyV2Url = 'apiV2/property';

@Injectable({
  providedIn: 'root'
})
export class PropertyService extends DataService<any> {

  constructor(http: HttpClient) {
    super(propertyV2Url, http);
  }

  getAllPropertyByText(text?: any) {
    return this.http.get<any>(`${propertyV2Url}/getAllPropertyByText?text=${text}`).toPromise();
  }

  searchProperty(q: string): Observable<any> {
    let apiURL = `${propertyV2Url}/getAllPropertyByText?text=${q}`;
    return this.http.get(apiURL)
  }

  override find = async (_params: Partial<any>): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>(`${propertyV2Url}/find`));

  override getAll = async (selectedViewType?: string): Promise<any[]> => {
    const query = selectedViewType ? `?selectedViewType=${encodeURIComponent(selectedViewType)}` : '';
    return firstValueFrom(this.http.get<any[]>(`${propertyV2Url}${query}`));
  };

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${propertyV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(
      this.http.post<{ id?: number; insertId?: number; message?: string }>(`${propertyV2Url}`, params),
    );

    return {
      message: response?.message ?? 'Created',
      insertId: response?.insertId ?? response?.id,
    };
  };

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<any>(`${propertyV2Url}/${id}`, params));
    return { message: 'Updated' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<any>(`${propertyV2Url}/${id}`));
    return { message: 'Deleted' };
  };


}

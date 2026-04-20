import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../DataService';
import { Observable, firstValueFrom } from 'rxjs';

const licenseV2Url = 'apiV2/license';

@Injectable({
  providedIn: 'root'
})
export class LicenseService extends DataService<any> {

  constructor(http: HttpClient) {
    super(licenseV2Url, http);
  }

  override find = async (_params: Partial<any>): Promise<any[]> =>
    firstValueFrom(this.http.get<any[]>(`${licenseV2Url}/find`));

  override getAll = async (selectedViewType?: string): Promise<any[]> => {
    const query = selectedViewType ? `?selectedViewType=${encodeURIComponent(selectedViewType)}` : '';
    return firstValueFrom(this.http.get<any[]>(`${licenseV2Url}${query}`));
  };

  searchLicense(q: string): Observable<any> {
    let apiURL = `${licenseV2Url}/searchLicense?text=${q}`;
    return this.http.get(apiURL)
  }

  getByIdAndTechs = async (id?: string) =>
    await firstValueFrom(this.http.get<any[]>(`${licenseV2Url}/getByIdAndTechs?id=${id}`));

  override getById = async (id: number): Promise<any> =>
    firstValueFrom(this.http.get<any>(`${licenseV2Url}/${id}`));

  override create = async (params: Partial<any>): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(
      this.http.post<{ id?: number; insertId?: number; message?: string }>(`${licenseV2Url}`, params),
    );

    return {
      message: response?.message ?? 'Created',
      insertId: response?.insertId ?? response?.id,
    };
  };

  override update = async (id: string | number, params: Partial<any>): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<any>(`${licenseV2Url}/${id}`, params));
    return { message: 'Updated' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<any>(`${licenseV2Url}/${id}`));
    return { message: 'Deleted' };
  };


}

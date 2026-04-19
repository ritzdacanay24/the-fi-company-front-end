import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '@app/core/services/auth.service';

const BASE_URL = 'apiv2/table-filter-settings';

@Injectable({
  providedIn: 'root'
})
export class TableFilterSettingsService {

  constructor(private http: HttpClient, private authenticationService: AuthenticationService) {}

  find = async (params: Record<string, any>): Promise<any[]> => {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val != null) httpParams = httpParams.set(key, String(val));
    });
    return firstValueFrom(this.http.get<any[]>(`${BASE_URL}/find`, { params: httpParams }));
  }

  findOne = async (params: Record<string, any>): Promise<any> => {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val != null) httpParams = httpParams.set(key, String(val));
    });
    return firstValueFrom(this.http.get<any>(`${BASE_URL}/find-one`, { params: httpParams }));
  }

  getAll = async (): Promise<any[]> => firstValueFrom(this.http.get<any[]>(BASE_URL));

  getById = async (id: number): Promise<any> => firstValueFrom(this.http.get<any>(`${BASE_URL}/${id}`));

  create = async (params: Record<string, any>): Promise<{ message: string; insertId?: number }> =>
    firstValueFrom(this.http.post<{ message: string; insertId?: number }>(BASE_URL, params));

  saveTableSettings = async (id: number | string, params: Record<string, any>): Promise<any> =>
    firstValueFrom(this.http.put<any>(`${BASE_URL}/${id}`, params));

  delete = async (id: number): Promise<any> => firstValueFrom(this.http.delete<any>(`${BASE_URL}/${id}`));

  getTableByUserId = async (params: Record<string, any>): Promise<any> => {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val != null) httpParams = httpParams.set(key, String(val));
    });
    httpParams = httpParams.set('userId', String(this.authenticationService.currentUserValue.id));

    const data = await firstValueFrom(this.http.get<any[]>(`${BASE_URL}/find`, { params: httpParams }));
    const currentView: any = data.filter((row) => row.table_default === 1);

    return {
      currentView: currentView?.length ? { ...currentView[0], data: typeof currentView[0].data === 'string' ? JSON.parse(currentView[0].data) : currentView[0].data } : false,
      data
    };
  }
}

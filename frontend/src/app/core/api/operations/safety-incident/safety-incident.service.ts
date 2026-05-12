import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../DataService';
import { firstValueFrom } from 'rxjs';
import { queryString } from 'src/assets/js/util/queryString';
import { AuthenticationService } from '@app/core/services/auth.service';

const url = 'apiV2/safety-incident';

@Injectable({
  providedIn: 'root',
})
export class SafetyIncidentService extends DataService<any> {
  constructor(http: HttpClient, private authService: AuthenticationService) {
    super(url, http);
  }

  private get userIdHeader(): Record<string, string> {
    const id = this.authService.currentUserValue?.id;
    return id ? { 'x-user-id': String(id) } : {};
  }

  getList = async (
    selectedViewType: string,
    dateFrom: string,
    dateTo: string,
    isAll = false
  ) => {
    return await firstValueFrom(
      this.http.get<any[]>(
        `${url}/getList?selectedViewType=${encodeURIComponent(selectedViewType)}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}&isAll=${isAll}`
      )
    );
  };

  override find = async (params: any): Promise<any[]> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any[]>(`${url}/find${result}`));
  };

  override findOne = async (params: any): Promise<any> => {
    const result = queryString(params);
    return await firstValueFrom(this.http.get<any>(`${url}/findOne${result}`));
  };

  override getAll = async (): Promise<any[]> => {
    return await firstValueFrom(this.http.get<any[]>(`${url}/getAll`));
  };

  override getById = async (id: number): Promise<any> => {
    return await firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));
  };

  override create = async (params: any): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(
      this.http.post<any>(`${url}/create`, params, { headers: this.userIdHeader })
    );

    return {
      message: 'Safety incident created successfully',
      insertId: response?.id,
    };
  };

  createPublic = async (params: any): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(
      this.http.post<any>(`${url}/create-public`, params)
    );

    return {
      message: 'Safety incident created successfully',
      insertId: response?.id,
    };
  };

  override update = async (id: number | string, params: any): Promise<{ message: string }> => {
    await firstValueFrom(
      this.http.put<any>(`${url}/updateById/${id}`, params, { headers: this.userIdHeader })
    );
    return { message: 'Safety incident updated successfully' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(
      this.http.delete<any>(`${url}/deleteById/${id}`, { headers: this.userIdHeader })
    );
    return { message: 'Safety incident deleted successfully' };
  };

  archive = async (id: number): Promise<any> => {
    return await firstValueFrom(this.http.patch<any>(`${url}/archiveById/${id}`, {}, { headers: this.userIdHeader }));
  };

  unarchive = async (id: number): Promise<any> => {
    return await firstValueFrom(this.http.patch<any>(`${url}/unarchiveById/${id}`, {}, { headers: this.userIdHeader }));
  };

  getArchived = async (): Promise<any[]> => {
    return await firstValueFrom(this.http.get<any[]>(`${url}/getArchived`));
  };
}

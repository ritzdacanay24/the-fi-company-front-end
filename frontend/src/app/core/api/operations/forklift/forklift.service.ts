import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DataService } from '../../DataService';

const url = 'apiV2/forklift';
const legacyUrl = 'operations/forklift';

@Injectable({
  providedIn: 'root',
})
export class ForkliftService extends DataService<any> {
  constructor(http: HttpClient) {
    super(legacyUrl, http);
  }

  getList = async (selectedViewType: string = 'Active'): Promise<any[]> => {
    return await firstValueFrom(this.http.get<any[]>(`${url}/getList?selectedViewType=${encodeURIComponent(selectedViewType)}`));
  };

  getInspectionOptions = async (): Promise<Array<{ name: string; details: Array<{ name: string }> }>> => {
    return await firstValueFrom(this.http.get<Array<{ name: string; details: Array<{ name: string }> }>>(`${url}/inspectionOptions`));
  };

  override getAll = async (): Promise<any[]> => {
    return await firstValueFrom(this.http.get<any[]>(`${url}/getAll`));
  };

  override getById = async (id: number): Promise<any> => {
    return await firstValueFrom(this.http.get<any>(`${url}/getById?id=${id}`));
  };

  override create = async (params: any): Promise<{ message: string; insertId?: number }> => {
    const response = await firstValueFrom(this.http.post<{ insertId?: number }>(`${url}/create`, params));
    return {
      message: 'Successfully created',
      insertId: response?.insertId,
    };
  };

  override update = async (id: number | string, params: any): Promise<{ message: string }> => {
    await firstValueFrom(this.http.put<{ rowCount: number }>(`${url}/updateById?id=${id}`, params));
    return { message: 'Successfully updated' };
  };

  override delete = async (id: number): Promise<{ message: string }> => {
    await firstValueFrom(this.http.delete<{ rowCount: number }>(`${url}/deleteById?id=${id}`));
    return { message: 'Successfully deleted' };
  };

  getMaintenanceHistory = async (forkliftId: number): Promise<any[]> => {
    return await firstValueFrom(this.http.get<any[]>(`${url}/maintenance?forklift_id=${forkliftId}`));
  };

  createMaintenanceRecord = async (payload: {
    forklift_id: number;
    service_date: string;
    hour_meter?: number | null;
    service_type: string;
    description?: string;
    vendor_name?: string;
    cost?: number | null;
    work_order_no?: string;
    next_service_date?: string;
    next_service_hour_meter?: number | null;
    created_by: number;
  }): Promise<{ insertId: number }> => {
    return await firstValueFrom(this.http.post<{ insertId: number }>(`${url}/maintenance`, payload));
  };

  updateMaintenanceRecord = async (payload: {
    id: number;
    service_date?: string;
    hour_meter?: number | null;
    service_type?: string;
    description?: string;
    vendor_name?: string;
    cost?: number | null;
    work_order_no?: string;
    next_service_date?: string;
    next_service_hour_meter?: number | null;
    active?: number;
  }): Promise<{ rowCount: number }> => {
    return await firstValueFrom(this.http.put<{ rowCount: number }>(`${url}/maintenance`, payload));
  };
}

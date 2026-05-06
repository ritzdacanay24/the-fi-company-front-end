import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';

const API_URL = 'apiV2/igt-serial-numbers';

@Injectable({
  providedIn: 'root'
})
export class SerialNumberService {

  constructor(private http: HttpClient) { }

  getAll(params?: { includeInactive?: boolean }): Promise<any[]> {
    let httpParams = new HttpParams();
    if (params?.includeInactive) httpParams = httpParams.set('includeInactive', '1');
    return firstValueFrom(this.http.get<any[]>(API_URL, { params: httpParams }));
  }

  getById(id: number): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${API_URL}/${id}`));
  }

  add(serial: any): Promise<any> {
    return firstValueFrom(this.http.post(API_URL, serial));
  }

  create(serial: any): Promise<any> {
    return this.add(serial);
  }

  bulkUpload(serials: any[]): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}/bulk`, { serials }));
  }

  update(id: number, data: any): Promise<any> {
    return firstValueFrom(this.http.put(`${API_URL}/${id}`, data));
  }

  delete(id: number): Promise<any> {
    return firstValueFrom(this.http.delete(`${API_URL}/${id}`));
  }

  hardDelete(id: number): Promise<any> {
    return firstValueFrom(this.http.delete(`${API_URL}/${id}?hard=true`));
  }

  bulkDelete(ids: number[]): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}/bulk-delete`, { ids }));
  }

  bulkHardDelete(ids: number[]): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}/bulk-delete`, { ids, hard: true }));
  }

  getUsageStatistics(): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${API_URL}/stats`));
  }

  getAvailable(category: string = 'gaming', limit: number = 5000): Promise<any[]> {
    return firstValueFrom(
      this.http.get<any[]>(`${API_URL}/available`, {
        params: new HttpParams().set('category', category).set('limit', limit.toString())
      })
    );
  }

  reserveSerialNumber(serialNumber: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}/reserve`, { serial_number: serialNumber }));
  }

  releaseSerialNumber(serialNumber: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}/release`, { serial_number: serialNumber }));
  }

  checkExistingSerials(serialNumbers: string[]): Promise<string[]> {
    return firstValueFrom(
      this.http.post<any>(`${API_URL}/check-existing`, { serial_numbers: serialNumbers }).pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response;
          }

          if (Array.isArray(response?.data)) {
            return response.data;
          }

          return [];
        })
      )
    );
  }

  bulkUploadRange(options: {
    serialNumbers: { serial_number: string; category: string }[];
  }): Promise<{ created: number; updated: number; errors: any[] }> {
    return firstValueFrom(this.http.post<any>(`${API_URL}/bulk-upload`, {
      serialNumbers: options.serialNumbers,
      category: 'gaming',
      duplicateStrategy: 'error',
    }));
  }

  // Backward-compatible wrapper for existing callers.
  bulkUploadWithOptions(options: {
    serialNumbers: { serial_number: string; category: string }[];
    duplicateStrategy?: 'skip' | 'replace' | 'error';
    category?: string;
  }): Promise<{ created: number; updated: number; errors: any[] }> {
    return this.bulkUploadRange(options);
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API_URL = 'IgtAssets/igt_serial_numbers_crud';

@Injectable({
  providedIn: 'root'
})
export class SerialNumberService {

  constructor(private http: HttpClient) { }

  // Get all serial numbers
  getAll(params?: { includeInactive?: boolean }): Promise<any[]> {
    let url = API_URL + '?path=serial-numbers';
    if (params?.includeInactive === true) {
      url += `&includeInactive=1`;
    }
    return firstValueFrom(this.http.get<any[]>(url));
  }

  // Get a serial number by ID
  getById(id: number): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${API_URL}?path=serial-numbers&id=${id}`));
  }

  // Add a single serial number
  add(serial: any): Promise<any> {
    return firstValueFrom(this.http.post(API_URL + '?path=serial-numbers', serial));
  }

  // Create a single serial number (alias for add)
  create(serial: any): Promise<any> {
    return this.add(serial);
  }

  // Bulk upload serial numbers
  bulkUpload(serials: any[]): Promise<any> {
    return firstValueFrom(this.http.post(API_URL + '?path=serial-numbers', serials));
  }

  // Update a serial number (implement in PHP if needed)
  update(id: number, data: any): Promise<any> {
    return firstValueFrom(this.http.put(`${API_URL}?path=serial-numbers&id=${id}`, data));
  }

  // Delete a serial number (soft delete - marks as is_active = 0)
  delete(id: number): Promise<any> {
    return firstValueFrom(this.http.delete(`${API_URL}?path=serial-numbers&id=${id}`));
  }

  // Hard delete a serial number (permanently removes from database)
  hardDelete(id: number): Promise<any> {
    return firstValueFrom(this.http.delete(`${API_URL}?path=serial-numbers&id=${id}&hard=true`));
  }

  // Bulk delete serial numbers (soft delete)
  bulkDelete(ids: number[]): Promise<any> {
    return firstValueFrom(this.http.delete(API_URL + '?path=serial-numbers', { 
      body: { ids },
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  // Bulk hard delete serial numbers (permanently removes from database)
  bulkHardDelete(ids: number[]): Promise<any> {
    return firstValueFrom(this.http.delete(API_URL + '?path=serial-numbers', { 
      body: { ids, hard: true },
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  // Get usage statistics
  getUsageStatistics(): Promise<any> {
    return firstValueFrom(this.http.get<any>(API_URL + '?path=serial-numbers/stats'));
  }

  // Get available serial numbers for selection
  getAvailable(category: string = 'gaming', limit: number = 100): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${API_URL}?path=serial-numbers/available&category=${category}&limit=${limit}`));
  }

  // Reserve a serial number (mark as reserved temporarily)
  reserveSerialNumber(serialNumber: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}?path=serial-numbers/reserve`, { serial_number: serialNumber }));
  }

  // Release a reserved serial number (mark as available again)
  releaseSerialNumber(serialNumber: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_URL}?path=serial-numbers/release`, { serial_number: serialNumber }));
  }

  
}
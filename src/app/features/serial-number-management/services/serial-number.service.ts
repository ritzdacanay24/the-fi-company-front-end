import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { SerialNumber, SerialNumberAssignment, SerialNumberReport, SerialNumberUsageReport, SerialNumberStats, SerialNumberBatch } from '../models/serial-number.model';

@Injectable({
  providedIn: 'root'
})
export class SerialNumberService {
  // DO NOT MODIFY: This API_URL is correct for the current backend structure
  // ANY CHANGES TO THIS WILL BREAK THE API CALLS
  // The ApiPrefixInterceptor automatically adds: https://dashboard.eye-fi.com/server/Api/
  // Final URL will be: https://dashboard.eye-fi.com/server/Api/eyefi-serial-numbers/index.php
  private readonly API_URL = 'eyefi-serial-numbers';

  constructor(private http: HttpClient) {}

  // Serial Number CRUD Operations
  async getAllSerialNumbers(filters?: any): Promise<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key]);
        }
      });
    }
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  async getSerialNumberById(id: number): Promise<any> {
    const params = new HttpParams().set('id', id.toString());
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  async getSerialNumberByNumber(serialNumber: string): Promise<any> {
    const params = new HttpParams().set('serial_number', serialNumber);
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  async createSerialNumber(serialNumber: SerialNumber): Promise<any> {
    return await firstValueFrom(this.http.post(`${this.API_URL}/index.php`, serialNumber));
  }

  async updateSerialNumber(id: number, serialNumber: SerialNumber): Promise<any> {
    const params = new HttpParams().set('id', id.toString());
    return await firstValueFrom(this.http.put(`${this.API_URL}/index.php`, serialNumber, { params }));
  }

  async deleteSerialNumber(id: number): Promise<any> {
    const params = new HttpParams().set('id', id.toString());
    return await firstValueFrom(this.http.delete(`${this.API_URL}/index.php`, { params }));
  }

  // Bulk create serial numbers (for range uploads)
  async bulkCreateSerialNumbers(serialNumbers: Partial<SerialNumber>[]): Promise<any> {
    return await firstValueFrom(this.http.post(`${this.API_URL}/index.php?action=bulk-upload`, { serialNumbers: serialNumbers }));
  }

  // Create serial numbers from range
  async createSerialNumbersFromRange(rangeData: any): Promise<any> {
    return await firstValueFrom(this.http.post(`${this.API_URL}/index.php?action=bulk-upload`, rangeData));
  }

  // Generate serial numbers batch  
  async generateSerialNumbersBatch(batchData: Partial<SerialNumberBatch>): Promise<any> {
    return await firstValueFrom(this.http.post(`${this.API_URL}/index.php?action=bulk-upload`, batchData));
  }

  // Get EyeFi serial statistics
  async getEyeFiStatistics(): Promise<any> {
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php?action=statistics`));
  }

  // Search serial numbers with filters
  async searchSerialNumbers(searchQuery: string, additionalFilters?: any): Promise<any> {
    let params = new HttpParams().set('search', searchQuery);
    
    if (additionalFilters) {
      Object.keys(additionalFilters).forEach(key => {
        if (additionalFilters[key] !== null && additionalFilters[key] !== undefined && additionalFilters[key] !== '') {
          params = params.set(key, additionalFilters[key]);
        }
      });
    }
    
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  // Serial Number Assignment Operations
  async assignSerialNumber(assignment: SerialNumberAssignment): Promise<any> {
    return firstValueFrom(this.http.post(`${this.API_URL}/index.php?action=assign`, assignment));
  }

  async getSerialNumberAssignments(filters: any = {}): Promise<any> {
    let params = new HttpParams().set('action', 'assignments');
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params = params.set(key, filters[key]);
        }
      });
    }
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  async getAssignmentBySerialNumber(serialNumber: string): Promise<any> {
    const params = new HttpParams()
      .set('action', 'assignments')
      .set('serial_number', serialNumber);
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  async updateAssignment(id: number, assignment: SerialNumberAssignment): Promise<any> {
    return await firstValueFrom(this.http.put(`${this.API_URL}/index.php?id=${id}`, assignment));
  }

  // Update serial number status
  async updateSerialNumberStatus(serialNumber: string, status: string, reason?: string): Promise<any> {
    const data = { serial_number: serialNumber, status: status };
    if (reason) {
      (data as any).reason = reason;
    }
    return await firstValueFrom(this.http.put(`${this.API_URL}/index.php`, data));
  }

  // Export serial numbers to CSV
  async exportSerialNumbers(serialNumbers: string[] = []): Promise<any> {
    let params = new HttpParams().set('action', 'export');
    
    if (serialNumbers.length > 0) {
      params = params.set('serial_numbers', serialNumbers.join(','));
    }
    
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { 
      params,
      responseType: 'blob' as 'json'
    }));
  }

  // Serial Number Reports
  async getSerialNumberReport(filters?: any): Promise<SerialNumberReport[]> {
    let params = new HttpParams().set('action', 'reports');
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return await firstValueFrom(this.http.get<SerialNumberReport[]>(`${this.API_URL}/index.php`, { params }));
  }

  async getUsageReport(filters?: any): Promise<SerialNumberUsageReport[]> {
    let params = new HttpParams().set('action', 'usage-report');
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return await firstValueFrom(this.http.get<SerialNumberUsageReport[]>(`${this.API_URL}/index.php`, { params }));
  }

  // Serial Number Statistics
  async getSerialNumberStats(): Promise<SerialNumberStats> {
    return await firstValueFrom(this.http.get<SerialNumberStats>(`${this.API_URL}/index.php?action=statistics`));
  }

  // Utility Methods
  async getAvailableSerialNumbers(limit?: number): Promise<any> {
    let params = new HttpParams().set('action', 'available');
    if (limit) {
      params = params.set('limit', limit.toString());
    }
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  async validateSerialNumber(serialNumber: string): Promise<any> {
    const params = new HttpParams()
      .set('action', 'validate')
      .set('serial_number', serialNumber);
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  async getProductModels(): Promise<string[]> {
    return await firstValueFrom(this.http.get<string[]>(`${this.API_URL}/index.php?action=product-models`));
  }

  // QR Code and Barcode generation
  async generateQRCode(serialNumber: string): Promise<any> {
    const params = new HttpParams()
      .set('action', 'qr-code')
      .set('serial_number', serialNumber);
    return await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

  async generateBarcode(serialNumber: string): Promise<any> {
    const params = new HttpParams()
      .set('action', 'barcode')
      .set('serial_number', serialNumber);
    return  await firstValueFrom(this.http.get(`${this.API_URL}/index.php`, { params }));
  }

}
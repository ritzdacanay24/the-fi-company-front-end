import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { SerialNumber, SerialNumberAssignment, SerialNumberReport, SerialNumberUsageReport, SerialNumberStats, SerialNumberBatch } from '../models/serial-number.model';
import { PrintReportData } from '@app/shared/services/serial-report-print.service';

@Injectable({
  providedIn: 'root'
})
export class SerialNumberService {
  private readonly API_URL = 'apiV2/eyefi-serial-numbers';
  private readonly AVAILABILITY_URL = 'apiV2/serial-availability';
  private readonly ASSET_URL = 'apiV2/eyefi-asset-numbers';

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
    return await firstValueFrom(this.http.get(`${this.API_URL}`, { params }));
  }

  async getSerialNumberById(id: number): Promise<any> {
    return await firstValueFrom(this.http.get(`${this.API_URL}/${id}`));
  }

  async getSerialNumberByNumber(serialNumber: string): Promise<any> {
    return await firstValueFrom(this.http.get(`${this.API_URL}/serial/${serialNumber}`));
  }

  async createSerialNumber(serialNumber: SerialNumber): Promise<any> {
    return await firstValueFrom(this.http.post(`${this.API_URL}`, serialNumber));
  }

  async updateSerialNumber(id: number, serialNumber: SerialNumber): Promise<any> {
    return await firstValueFrom(this.http.put(`${this.API_URL}/${id}`, serialNumber));
  }

  async deleteSerialNumber(id: number): Promise<any> {
    return await firstValueFrom(this.http.delete(`${this.API_URL}/${id}`));
  }

  // Bulk create serial numbers
  async bulkCreateSerialNumbers(serialNumbers: Partial<SerialNumber>[]): Promise<any> {
    return await firstValueFrom(this.http.post(`${this.API_URL}/bulk`, { serialNumbers }));
  }

  // Create serial numbers from range (alias for bulk create)
  async createSerialNumbersFromRange(rangeData: any): Promise<any> {
    return await firstValueFrom(this.http.post(`${this.API_URL}/bulk`, rangeData));
  }

  // Generate serial numbers batch (alias for bulk create)
  async generateSerialNumbersBatch(batchData: Partial<SerialNumberBatch>): Promise<any> {
    return await firstValueFrom(this.http.post(`${this.API_URL}/bulk`, batchData));
  }

  // Get EyeFi serial statistics
  async getEyeFiStatistics(): Promise<any> {
    return await firstValueFrom(this.http.get(`${this.API_URL}/statistics`));
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

    return await firstValueFrom(this.http.get(`${this.API_URL}`, { params }));
  }

  // Serial Number Assignment Operations
  async assignSerialNumber(assignment: SerialNumberAssignment): Promise<any> {
    return firstValueFrom(this.http.post(`${this.API_URL}/assignments`, assignment));
  }

  async getSerialNumberAssignments(filters: any = {}): Promise<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });
    return await firstValueFrom(this.http.get(`${this.API_URL}/assignments`, { params }));
  }

  async getAssignmentBySerialNumber(serialNumber: string): Promise<any> {
    return await firstValueFrom(this.http.get(`${this.API_URL}/assignments`, {
      params: new HttpParams().set('serial_number', serialNumber)
    }));
  }

  async updateAssignment(id: number, assignment: Partial<SerialNumberAssignment>): Promise<any> {
    return await firstValueFrom(this.http.put(`${this.API_URL}/assignments/${id}`, assignment));
  }

  // Update serial number status
  async updateSerialNumberStatus(serialNumber: string, status: string, reason?: string): Promise<any> {
    const data: any = { status };
    if (reason) data.reason = reason;
    return await firstValueFrom(this.http.put(`${this.API_URL}/serial/${serialNumber}/status`, data));
  }

  // Export serial numbers to CSV
  async exportSerialNumbers(serialNumbers: string[] = []): Promise<any> {
    let params = new HttpParams();
    if (serialNumbers.length > 0) {
      params = params.set('serial_numbers', serialNumbers.join(','));
    }
    return await firstValueFrom(this.http.get(`${this.API_URL}/export`, {
      params,
      responseType: 'blob' as 'json'
    }));
  }

  // Serial Number Reports — use search endpoint with date filters
  async getSerialNumberReport(filters?: any): Promise<SerialNumberReport[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => { if (filters[key]) params = params.set(key, filters[key]); });
    }
    return await firstValueFrom(this.http.get<SerialNumberReport[]>(`${this.API_URL}`, { params }));
  }

    async sendSerialWorkflowReport(reportData: PrintReportData): Promise<any> {
      return await firstValueFrom(this.http.post(`${this.API_URL}/send-report`, reportData));
    }
  async getUsageReport(filters?: any): Promise<SerialNumberUsageReport[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => { if (filters[key]) params = params.set(key, filters[key]); });
    }
    return await firstValueFrom(this.http.get<SerialNumberUsageReport[]>(`${this.API_URL}/assignments`, { params }));
  }

  // Serial Number Statistics
  async getSerialNumberStats(): Promise<SerialNumberStats> {
    return await firstValueFrom(this.http.get<SerialNumberStats>(`${this.API_URL}/statistics`));
  }

  // Get available serials (status filter)
  async getAvailableSerialNumbers(limit?: number): Promise<any> {
    let params = new HttpParams().set('status', 'available');
    if (limit) params = params.set('limit', limit.toString());
    return await firstValueFrom(this.http.get(`${this.API_URL}`, { params }));
  }

  // Serial availability — available/recently-used via dedicated NestJS module
  async getAvailableSerialsFromViews(limit?: number): Promise<any> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    return await firstValueFrom(this.http.get(`${this.AVAILABILITY_URL}/available/eyefi-serials`, { params }));
  }

  async getAvailabilitySummaryFromAPI(): Promise<any> {
    return await firstValueFrom(this.http.get(`${this.AVAILABILITY_URL}/summary`));
  }

  async getAvailableUlLabelsFromAPI(limit?: number): Promise<any> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    return await firstValueFrom(this.http.get(`${this.AVAILABILITY_URL}/available/ul-labels`, { params }));
  }

  async getAvailableEyefiSerialsFromAPI(limit?: number): Promise<any> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    return await firstValueFrom(this.http.get(`${this.AVAILABILITY_URL}/available/eyefi-serials`, { params }));
  }

  async getAvailableIgtSerialsFromAPI(limit?: number): Promise<any> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    return await firstValueFrom(this.http.get(`${this.AVAILABILITY_URL}/available/igt-serials`, { params }));
  }

  async getRecentlyUsedEyefiSerialsFromAPI(limit?: number): Promise<any> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    return await firstValueFrom(this.http.get(`${this.AVAILABILITY_URL}/recently-used/eyefi-serials`, { params }));
  }

  async getRecentlyUsedIgtSerialsFromAPI(limit?: number): Promise<any> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    return await firstValueFrom(this.http.get(`${this.AVAILABILITY_URL}/recently-used/igt-serials`, { params }));
  }

  async validateSerialNumber(serialNumber: string): Promise<any> {
    return await firstValueFrom(this.http.get(`${this.API_URL}/serial/${serialNumber}`));
  }

  async getProductModels(): Promise<string[]> {
    return await firstValueFrom(this.http.get<string[]>(`${this.API_URL}/product-models`));
  }

  // EyeFi Asset Number generation
  async generateEyefiAssetNumbers(count: number, category: string = 'New'): Promise<any> {
    return await firstValueFrom(
      this.http.post<any>(`${this.ASSET_URL}/generate`, { quantity: count, category })
    );
  }
}


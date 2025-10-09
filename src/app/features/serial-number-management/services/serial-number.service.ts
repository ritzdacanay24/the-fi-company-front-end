import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SerialNumber, SerialNumberAssignment, SerialNumberReport, SerialNumberUsageReport, SerialNumberStats, SerialNumberBatch } from '../models/serial-number.model';

@Injectable({
  providedIn: 'root'
})
export class SerialNumberService {
  private readonly API_URL = '/serial-numbers';

  constructor(private http: HttpClient) {}

  // Serial Number CRUD Operations
  getAllSerialNumbers(): Observable<any> {
    return this.http.get(`${this.API_URL}/index.php`);
  }

  getSerialNumberById(id: number): Observable<any> {
    return this.http.get(`${this.API_URL}/index.php?id=${id}`);
  }

  getSerialNumberByNumber(serialNumber: string): Observable<any> {
    const params = new HttpParams().set('serial_number', serialNumber);
    return this.http.get(`${this.API_URL}/index.php`, { params });
  }

  createSerialNumber(serialNumber: SerialNumber): Observable<any> {
    return this.http.post(`${this.API_URL}/index.php`, serialNumber);
  }

  updateSerialNumber(id: number, serialNumber: SerialNumber): Observable<any> {
    return this.http.put(`${this.API_URL}/index.php?id=${id}`, serialNumber);
  }

  deleteSerialNumber(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/index.php?id=${id}`);
  }

  // Bulk create serial numbers (for range uploads)
  bulkCreateSerialNumbers(serialNumbers: Partial<SerialNumber>[]): Observable<any> {
    return this.http.post(`${this.API_URL}/bulk-upload.php`, { serial_numbers: serialNumbers });
  }

  // Create serial numbers from range
  createSerialNumbersFromRange(rangeData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/bulk-upload.php`, rangeData);
  }

  // Generate serial numbers batch
  generateSerialNumbersBatch(batchData: Partial<SerialNumberBatch>): Observable<any> {
    return this.http.post(`${this.API_URL}/generate-batch.php`, batchData);
  }

  // Bulk upload serial numbers
  bulkUploadSerialNumbers(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.API_URL}/bulk-upload`, formData);
  }

  // Search serial numbers
  searchSerialNumbers(query: string): Observable<any> {
    const params = new HttpParams().set('search', query);
    return this.http.get(`${this.API_URL}/search`, { params });
  }

  // Serial Number Assignment Operations
  assignSerialNumber(assignment: SerialNumberAssignment): Observable<any> {
    return this.http.post(`${this.API_URL}/assignments.php`, assignment);
  }

  getSerialNumberAssignments(): Observable<any> {
    return this.http.get(`${this.API_URL}/assignments.php`);
  }

  getAssignmentBySerialNumber(serialNumber: string): Observable<any> {
    const params = new HttpParams().set('serial_number', serialNumber);
    return this.http.get(`${this.API_URL}/assignments.php`, { params });
  }

  updateAssignment(id: number, assignment: SerialNumberAssignment): Observable<any> {
    return this.http.put(`${this.API_URL}/assignments.php?id=${id}`, assignment);
  }

  // Serial Number Reports
  getSerialNumberReport(filters?: any): Observable<SerialNumberReport[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<SerialNumberReport[]>(`${this.API_URL}/reports.php`, { params });
  }

  getUsageReport(filters?: any): Observable<SerialNumberUsageReport[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<SerialNumberUsageReport[]>(`${this.API_URL}/usage-report.php`, { params });
  }

  // Serial Number Statistics
  getSerialNumberStats(): Observable<SerialNumberStats> {
    return this.http.get<SerialNumberStats>(`${this.API_URL}/stats.php`);
  }

  // Utility Methods
  getAvailableSerialNumbers(limit?: number): Observable<any> {
    let params = new HttpParams();
    if (limit) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get(`${this.API_URL}/available.php`, { params });
  }

  validateSerialNumber(serialNumber: string): Observable<any> {
    const params = new HttpParams().set('serial_number', serialNumber);
    return this.http.get(`${this.API_URL}/validate.php`, { params });
  }

  getProductModels(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/product-models.php`);
  }

  // QR Code and Barcode generation
  generateQRCode(serialNumber: string): Observable<any> {
    const params = new HttpParams().set('serial_number', serialNumber);
    return this.http.get(`${this.API_URL}/qr-code.php`, { params });
  }

  generateBarcode(serialNumber: string): Observable<any> {
    const params = new HttpParams().set('serial_number', serialNumber);
    return this.http.get(`${this.API_URL}/barcode.php`, { params });
  }

  // Export functionality
  exportSerialNumbers(filters?: any): Observable<Blob> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get(`${this.API_URL}/export.php`, { 
      params, 
      responseType: 'blob' 
    });
  }
}
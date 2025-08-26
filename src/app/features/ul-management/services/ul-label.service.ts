import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ULLabel, ULLabelUsage, ULLabelReport, ULUsageReport } from '../models/ul-label.model';
import { ULLabelMockService } from './ul-label-mock.service';
import { MockToggleService } from './mock-toggle.service';

@Injectable({
  providedIn: 'root'
})
export class ULLabelService {
  private readonly API_URL = '/backend/api/ul-labels';

  constructor(
    private http: HttpClient,
    private mockService: ULLabelMockService,
    private mockToggle: MockToggleService
  ) {}

  private get useMockData(): boolean {
    return this.mockToggle.currentValue;
  }

  // UL Label CRUD Operations
  getAllULLabels(): Observable<any> {
    if (this.useMockData) {
      return this.mockService.getULLabels();
    }
    return this.http.get(`${this.API_URL}`);
  }

  getULLabelById(id: number): Observable<any> {
    if (this.useMockData) {
      return this.mockService.getULLabel(id);
    }
    return this.http.get(`${this.API_URL}/${id}`);
  }

  createULLabel(ulLabel: ULLabel): Observable<any> {
    if (this.useMockData) {
      return this.mockService.createULLabel(ulLabel);
    }
    return this.http.post(`${this.API_URL}`, ulLabel);
  }

  updateULLabel(id: number, ulLabel: ULLabel): Observable<any> {
    if (this.useMockData) {
      return this.mockService.updateULLabel(id, ulLabel);
    }
    return this.http.put(`${this.API_URL}/${id}`, ulLabel);
  }

  deleteULLabel(id: number): Observable<any> {
    if (this.useMockData) {
      return this.mockService.deleteULLabel(id);
    }
    return this.http.delete(`${this.API_URL}/${id}`);
  }

  // Bulk create UL labels (for range uploads)
  bulkCreateULLabels(labels: Partial<ULLabel>[]): Observable<any> {
    if (this.useMockData) {
      return this.mockService.bulkCreateULLabels(labels);
    }
    return this.http.post(`${this.API_URL}/bulk-create`, { labels });
  }

  // Bulk upload UL labels
  bulkUploadULLabels(file: File): Observable<any> {
    if (this.useMockData) {
      return this.mockService.bulkUploadULLabels(file);
    }
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.API_URL}/bulk-upload`, formData);
  }

  // Search UL labels
  searchULLabels(query: string): Observable<any> {
    if (this.useMockData) {
      return this.mockService.searchULLabels(query);
    }
    const params = new HttpParams().set('search', query);
    return this.http.get(`${this.API_URL}/search`, { params });
  }

  // UL Label Usage Operations
  recordULLabelUsage(usage: ULLabelUsage): Observable<any> {
    if (this.useMockData) {
      return this.mockService.createULUsage(usage);
    }
    return this.http.post(`${this.API_URL}/usage`, usage);
  }

  getULLabelUsageHistory(ulLabelId: number): Observable<any> {
    if (this.useMockData) {
      return this.mockService.getULUsages();
    }
    return this.http.get(`${this.API_URL}/${ulLabelId}/usage-history`);
  }

  getAllULLabelUsages(): Observable<any> {
    if (this.useMockData) {
      return this.mockService.getULUsages();
    }
    return this.http.get(`${this.API_URL}/usage`);
  }

  updateULLabelUsage(id: number, usage: ULLabelUsage): Observable<any> {
    if (this.useMockData) {
      // Mock service doesn't have update usage yet, so return success
      return this.mockService.createULUsage(usage);
    }
    return this.http.put(`${this.API_URL}/usage/${id}`, usage);
  }

  deleteULLabelUsage(id: number): Observable<any> {
    if (this.useMockData) {
      // Mock service doesn't have delete usage yet, return success
      return this.mockService.getULUsages();
    }
    return this.http.delete(`${this.API_URL}/usage/${id}`);
  }

  // Reporting
  getULLabelReport(startDate?: string, endDate?: string): Observable<any> {
    if (this.useMockData) {
      return this.mockService.getLabelsReport({ start_date: startDate, end_date: endDate });
    }
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    
    return this.http.get(`${this.API_URL}/reports/labels`, { params });
  }

  getULUsageReport(startDate?: string, endDate?: string, customerName?: string): Observable<any> {
    if (this.useMockData) {
      return this.mockService.getUsageReport({ start_date: startDate, end_date: endDate, customer_name: customerName });
    }
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (customerName) params = params.set('customer_name', customerName);
    
    return this.http.get(`${this.API_URL}/reports/usage`, { params });
  }

  // Export functions
  exportULLabels(): Observable<Blob> {
    if (this.useMockData) {
      // For mock data, return a simple blob
      const csvData = "UL Number,Description,Category,Status\nE123456,Sample Label,Electronics,active";
      return new Observable(observer => {
        observer.next(new Blob([csvData], { type: 'text/csv' }));
        observer.complete();
      });
    }
    return this.http.get(`${this.API_URL}/export`, { responseType: 'blob' });
  }

  exportULUsageReport(startDate?: string, endDate?: string): Observable<Blob> {
    if (this.useMockData) {
      // For mock data, return a simple blob
      const csvData = "UL Number,Serial Number,Customer,Date Used,Quantity\nE123456,SN-001,ABC Corp,2024-08-20,2";
      return new Observable(observer => {
        observer.next(new Blob([csvData], { type: 'text/csv' }));
        observer.complete();
      });
    }
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    
    return this.http.get(`${this.API_URL}/reports/usage/export`, { params, responseType: 'blob' });
  }

  // File upload for label images
  uploadLabelImage(ulLabelId: number, file: File): Observable<any> {
    if (this.useMockData) {
      // For mock data, simulate upload success
      return new Observable(observer => {
        setTimeout(() => {
          observer.next({ success: true, message: 'Image uploaded successfully', data: { url: '/assets/mock-label.jpg' } });
          observer.complete();
        }, 1000);
      });
    }
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post(`${this.API_URL}/${ulLabelId}/upload-image`, formData);
  }

  // Status management
  updateULLabelStatus(id: number, status: 'active' | 'inactive' | 'expired'): Observable<any> {
    if (this.useMockData) {
      return this.mockService.updateULLabel(id, { status });
    }
    return this.http.patch(`${this.API_URL}/${id}/status`, { status });
  }

  // Get UL numbers for dropdown/autocomplete
  getULNumbers(): Observable<any> {
    if (this.useMockData) {
      return this.mockService.getULNumbers();
    }
    return this.http.get(`${this.API_URL}/ul-numbers`);
  }

  // Get available UL numbers (active status, not fully used)
  getAvailableULNumbers(): Observable<any> {
    if (this.useMockData) {
      return this.mockService.getAvailableULNumbers();
    }
    return this.http.get(`${this.API_URL}/available`);
  }

  // Validate UL number exists
  validateULNumber(ulNumber: string): Observable<any> {
    if (this.useMockData) {
      return this.mockService.validateULNumber(ulNumber);
    }
    const params = new HttpParams().set('ul_number', ulNumber);
    return this.http.get(`${this.API_URL}/validate`, { params });
  }

  // Dashboard statistics
  getDashboardStats(): Observable<any> {
    if (this.useMockData) {
      return this.mockService.getDashboardStats();
    }
    return this.http.get(`${this.API_URL}/dashboard-stats`);
  }
}

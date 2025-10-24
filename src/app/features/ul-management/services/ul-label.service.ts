import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ULLabel, ULLabelUsage, ULLabelReport, ULUsageReport } from '../models/ul-label.model';

@Injectable({
  providedIn: 'root'
})
export class ULLabelService {
  private readonly API_URL = '/ul-labels';

  constructor(private http: HttpClient) {}

  // UL Label CRUD Operations
  getAllULLabels(): Observable<any> {
    return this.http.get(`${this.API_URL}/index.php`);
  }

  getULLabelById(id: number): Observable<any> {
    return this.http.get(`${this.API_URL}/index.php?id=${id}`);
  }

  createULLabel(ulLabel: ULLabel): Observable<any> {
    return this.http.post(`${this.API_URL}/index.php`, ulLabel);
  }

  updateULLabel(id: number, ulLabel: ULLabel): Observable<any> {
    return this.http.put(`${this.API_URL}/index.php?id=${id}`, ulLabel);
  }

  deleteULLabel(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/index.php?id=${id}`);
  }

  // Bulk create UL labels (for range uploads)
  bulkCreateULLabels(labels: Partial<ULLabel>[]): Observable<any> {
    return this.http.post(`${this.API_URL}/bulk-upload.php`, { labels });
  }

  // Create UL labels from range
  createULLabelsFromRange(rangeData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/bulk-upload.php`, rangeData);
  }

  // Bulk upload UL labels
  bulkUploadULLabels(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.API_URL}/bulk-upload`, formData);
  }

  // Search UL labels with filters
  searchULLabels(searchQuery: string, additionalFilters?: any): Observable<any> {
    let params = new HttpParams().set('search', searchQuery);
    
    if (additionalFilters) {
      Object.keys(additionalFilters).forEach(key => {
        if (additionalFilters[key] !== null && additionalFilters[key] !== undefined && additionalFilters[key] !== '') {
          params = params.set(key, additionalFilters[key]);
        }
      });
    }
    
    return this.http.get(`${this.API_URL}/index.php`, { params });
  }

  // UL Label Usage Operations
  recordULLabelUsage(usage: ULLabelUsage): Observable<any> {
    return this.http.post(`${this.API_URL}/usage.php`, usage);
  }

  getULLabelUsageHistory(ulLabelId: number): Observable<any> {
    return this.http.get(`${this.API_URL}/usage.php?ul_label_id=${ulLabelId}`);
  }

  getAllULLabelUsages(): Observable<any> {
    return this.http.get(`${this.API_URL}/usage.php`);
  }

  updateULLabelUsage(id: number, usage: ULLabelUsage): Observable<any> {
    return this.http.put(`${this.API_URL}/usage.php?id=${id}`, usage);
  }

  deleteULLabelUsage(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/usage.php?id=${id}`);
  }

  // Reporting
  getULLabelReport(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    
    return this.http.get(`${this.API_URL}/index.php`, { params });
  }

  getULUsageReport(startDate?: string, endDate?: string, customerName?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (customerName) params = params.set('customer_name', customerName);
    
    return this.http.get(`${this.API_URL}/usage.php`, { params });
  }

  // Export functions
  exportULLabels(): Observable<Blob> {
    const params = new HttpParams().set('export', 'true');
    return this.http.get(`${this.API_URL}/index.php`, { params, responseType: 'blob' });
  }

  exportULUsageReport(startDate?: string, endDate?: string): Observable<Blob> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    params = params.set('export', 'true');
    
    return this.http.get(`${this.API_URL}/usage.php`, { params, responseType: 'blob' });
  }

  // File upload for label images
  uploadLabelImage(ulLabelId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('ul_label_id', ulLabelId.toString());
    return this.http.post(`${this.API_URL}/upload-image.php`, formData);
  }

  // Status management
  updateULLabelStatus(id: number, status: 'active' | 'inactive' | 'expired'): Observable<any> {
    return this.http.put(`${this.API_URL}/index.php?id=${id}`, { status });
  }

  // Get UL numbers for dropdown/autocomplete
  getULNumbers(): Observable<any> {
    return this.http.get(`${this.API_URL}/ul-numbers.php`);
  }

  // Get available UL numbers (active status, not fully used)
  getAvailableULNumbers(): Observable<any> {
    const params = new HttpParams().set('available', 'true');
    return this.http.get(`${this.API_URL}/index.php`, { params });
  }

  // Validate UL number exists
  validateULNumber(ulNumber: string): Observable<any> {
    const params = new HttpParams().set('ul_number', ulNumber);
    return this.http.get(`${this.API_URL}/validate.php`, { params });
  }

  // Dashboard statistics
  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.API_URL}/dashboard-stats.php`);
  }

  // Work Order Validation
  checkWorkOrderUsage(workOrderNumber: string | number): Observable<any> {
    const params = new HttpParams().set('wo_nbr', workOrderNumber.toString());
    return this.http.get(`${this.API_URL}/validate-work-order.php`, { params });
  }
}

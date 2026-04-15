import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ULLabel, ULLabelUsage, ULLabelReport, ULUsageReport } from '../models/ul-label.model';

@Injectable({
  providedIn: 'root'
})
export class ULLabelService {
  private readonly API_URL = '/apiV2/ul-labels';

  constructor(private http: HttpClient) {}

  // UL Label CRUD Operations
  listLabels(): Observable<any> {
    return this.http.get(`${this.API_URL}`);
  }

  getLabelById(id: number): Observable<any> {
    return this.http.get(`${this.API_URL}/${id}`);
  }

  createLabel(ulLabel: ULLabel): Observable<any> {
    return this.http.post(`${this.API_URL}`, ulLabel);
  }

  updateLabel(id: number, ulLabel: ULLabel): Observable<any> {
    return this.http.put(`${this.API_URL}/${id}`, ulLabel);
  }

  deleteLabel(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`);
  }

  // Bulk create UL labels (for range uploads)
  createLabelsBulk(labels: Partial<ULLabel>[]): Observable<any> {
    return this.http.post(`${this.API_URL}/bulk`, { labels });
  }

  createLabelsFromRange(rangeData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/bulk`, rangeData);
  }

  uploadLabelsFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.API_URL}/bulk`, formData);
  }

  searchLabels(searchQuery: string, additionalFilters?: any): Observable<any> {
    let params = new HttpParams().set('search', searchQuery);
    
    if (additionalFilters) {
      Object.keys(additionalFilters).forEach(key => {
        if (additionalFilters[key] !== null && additionalFilters[key] !== undefined && additionalFilters[key] !== '') {
          params = params.set(key, additionalFilters[key]);
        }
      });
    }
    
    return this.http.get(`${this.API_URL}`, { params });
  }

  createUsage(usage: ULLabelUsage): Observable<any> {
    return this.http.post(`${this.API_URL}/usages`, usage);
  }

  listUsageHistory(ulLabelId: number): Observable<any> {
    const params = new HttpParams().set('ulLabelId', ulLabelId.toString());
    return this.http.get(`${this.API_URL}/usages`, { params });
  }

  listUsages(): Observable<any> {
    return this.http.get(`${this.API_URL}/usages`);
  }

  updateUsage(id: number, usage: ULLabelUsage): Observable<any> {
    return this.http.put(`${this.API_URL}/usages/${id}`, usage);
  }

  deleteUsage(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/usages/${id}`);
  }

  voidUsage(id: number, voidReason?: string): Observable<any> {
    return this.http.post(`${this.API_URL}/usages/${id}/void`, {
      void_reason: voidReason
    });
  }

  getLabelsReport(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    
    return this.http.get(`${this.API_URL}`, { params });
  }

  getUsagesReport(startDate?: string, endDate?: string, customerName?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (customerName) params = params.set('customer_name', customerName);
    
    return this.http.get(`${this.API_URL}/usages`, { params });
  }

  exportLabels(): Observable<Blob> {
    const params = new HttpParams().set('export', 'true');
    return this.http.get(`${this.API_URL}`, { params, responseType: 'blob' });
  }

  exportUsagesReport(startDate?: string, endDate?: string): Observable<Blob> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    params = params.set('export', 'true');
    
    return this.http.get(`${this.API_URL}/usages`, { params, responseType: 'blob' });
  }

  uploadLabelAsset(ulLabelId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post(`${this.API_URL}/${ulLabelId}/image`, formData);
  }

  updateLabelStatus(id: number, status: 'active' | 'inactive' | 'expired'): Observable<any> {
    return this.http.put(`${this.API_URL}/${id}`, { status });
  }

  listLabelNumbers(): Observable<any> {
    return this.http.get(`${this.API_URL}/numbers`);
  }

  listAvailableLabels(): Observable<any> {
    const params = new HttpParams().set('available', 'true');
    return this.http.get(`${this.API_URL}`, { params });
  }

  validateLabelNumber(ulNumber: string): Observable<any> {
    const params = new HttpParams().set('ulNumber', ulNumber);
    return this.http.get(`${this.API_URL}/validation/number`, { params });
  }

  // Dashboard statistics
  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.API_URL}/stats/dashboard`);
  }

  validateWorkOrderUsage(workOrderNumber: string | number): Observable<any> {
    const params = new HttpParams().set('workOrderNumber', workOrderNumber.toString());
    return this.http.get(`${this.API_URL}/validation/work-order`, { params });
  }
}

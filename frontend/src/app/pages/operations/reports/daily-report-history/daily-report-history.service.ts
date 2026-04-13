import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DailyReportRecord {
  id: number;
  createdDate: string;
  data: any; // JSON column
  status: string;
}

export interface DailyReportFilter {
  startDate?: string;
  endDate?: string;
  status?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DailyReportHistoryService {
  private apiUrl = '/daily-report-history/'; // PHP backend endpoint

  constructor(private http: HttpClient) {}

  /**
   * Get daily report history with optional filters
   */
  getDailyReportHistory(filters?: DailyReportFilter): Observable<DailyReportRecord[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.status && filters.status !== 'all') params = params.set('status', filters.status);
      if (filters.searchTerm) params = params.set('search', filters.searchTerm);
      if (filters.page) params = params.set('page', String(filters.page));
      if (filters.limit) params = params.set('limit', String(filters.limit));
    }
    
    return this.http.get<DailyReportRecord[]>(this.apiUrl, { params });
  }

  /**
   * Get single daily report by ID
   */
  getDailyReport(id: number): Observable<DailyReportRecord> {
    return this.http.get<DailyReportRecord>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get reports by date range
   */
  getReportsByDateRange(startDate: string, endDate: string): Observable<DailyReportRecord[]> {
    let params = new HttpParams();
    params = params.set('startDate', startDate);
    params = params.set('endDate', endDate);
    
    return this.http.get<DailyReportRecord[]>(this.apiUrl, { params });
  }

  /**
   * Search reports by any field in JSON data
   */
  searchReports(searchTerm: string): Observable<DailyReportRecord[]> {
    let params = new HttpParams();
    params = params.set('search', searchTerm);
    
    return this.http.get<DailyReportRecord[]>(this.apiUrl, { params });
  }

  /**
   * Get latest daily report
   */
  getLatestReport(): Observable<DailyReportRecord> {
    return this.http.get<DailyReportRecord>(`${this.apiUrl}/latest`);
  }
}

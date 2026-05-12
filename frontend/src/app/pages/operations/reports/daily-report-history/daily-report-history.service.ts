import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

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
  providedIn: 'root',
})
export class DailyReportHistoryService {
  private readonly apiUrl = 'apiV2/reports/daily-report-history';

  constructor(private http: HttpClient) {}

  /**
   * Get daily report history with optional filters.
   */
  getDailyReportHistory(filters?: DailyReportFilter): Observable<{ success: boolean; data: DailyReportRecord[] }> {
    let params = new HttpParams();

    if (filters) {
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.page) params = params.set('page', String(filters.page));
      if (filters.limit) params = params.set('limit', String(filters.limit));
    }

    return this.http.get<{ success: boolean; data: DailyReportRecord[] }>(this.apiUrl, { params });
  }

  /**
   * Get single daily report by ID
   */
  getDailyReport(id: number): Observable<DailyReportRecord> {
    return this.getDailyReportHistory({ page: 1, limit: 200 }).pipe(
      map((response) => response.data.find((row) => Number(row.id) === id) as DailyReportRecord),
    );
  }

  /**
   * Get reports by date range
   */
  getReportsByDateRange(startDate: string, endDate: string): Observable<DailyReportRecord[]> {
    return this.getDailyReportHistory({ startDate, endDate, page: 1, limit: 200 }).pipe(
      map((response) => response.data),
    );
  }

  /**
   * Search reports by any field in JSON data
   */
  searchReports(searchTerm: string): Observable<DailyReportRecord[]> {
    return this.getDailyReportHistory({ page: 1, limit: 200 }).pipe(
      map((response) => {
        if (!searchTerm?.trim()) {
          return response.data;
        }

        const term = searchTerm.trim().toLowerCase();
        return response.data.filter((row) => JSON.stringify(row.data).toLowerCase().includes(term));
      }),
    );
  }

  /**
   * Get latest daily report
   */
  getLatestReport(): Observable<DailyReportRecord> {
    return this.getDailyReportHistory({ page: 1, limit: 1 }).pipe(
      map((response) => response.data[0]),
    );
  }
}

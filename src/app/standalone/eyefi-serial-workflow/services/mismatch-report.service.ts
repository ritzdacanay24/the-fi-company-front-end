import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MismatchReport, MismatchReportSummary } from '../models/mismatch-report.model';

@Injectable({
  providedIn: 'root'
})
export class MismatchReportService {
  private apiUrl = '/api/eyefi-serial-mismatch';

  constructor(private http: HttpClient) {}

  /**
   * Submit a new mismatch report
   */
  submitReport(report: MismatchReport): Observable<{ success: boolean; reportId: number; message: string }> {
    return this.http.post<{ success: boolean; reportId: number; message: string }>(
      `${this.apiUrl}/submit`,
      report
    );
  }

  /**
   * Get all mismatch reports (admin)
   */
  getAllReports(filters?: {
    status?: string;
    workOrder?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<MismatchReport[]> {
    return this.http.get<MismatchReport[]>(`${this.apiUrl}/reports`, { params: filters as any });
  }

  /**
   * Get single mismatch report by ID (admin)
   */
  getReportById(reportId: number): Observable<MismatchReport> {
    return this.http.get<MismatchReport>(`${this.apiUrl}/reports/${reportId}`);
  }

  /**
   * Update mismatch report investigation status (admin)
   */
  updateReportStatus(
    reportId: number,
    update: {
      status: string;
      investigationNotes?: string;
      resolutionAction?: string;
      rootCause?: string;
    }
  ): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(
      `${this.apiUrl}/reports/${reportId}/status`,
      update
    );
  }

  /**
   * Get mismatch report summary statistics (admin dashboard)
   */
  getSummary(dateRange?: { from: string; to: string }): Observable<MismatchReportSummary> {
    return this.http.get<MismatchReportSummary>(`${this.apiUrl}/summary`, {
      params: dateRange as any
    });
  }

  /**
   * Send notification to admins about new mismatch report
   */
  notifyAdmins(reportId: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/reports/${reportId}/notify`,
      {}
    );
  }
}

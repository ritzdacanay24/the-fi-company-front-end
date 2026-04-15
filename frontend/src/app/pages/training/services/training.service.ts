import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { 
  TrainingSession, 
  TrainingAttendance, 
  Employee, 
  BadgeScanResult,
  CreateTrainingSessionRequest,
  UpdateAttendanceRequest,
  TrainingMetrics
} from '../models/training.model';

export interface TrainingAdminReportSummary {
  totals: {
    total_sessions: number;
    completed_sessions: number;
    cancelled_sessions: number;
    scheduled_sessions: number;
    in_progress_sessions: number;
    expected_attendees: number;
    actual_attendees: number;
    attendance_rate: number;
  };
  weekly_trend: Array<{
    year_num: number;
    week_num: number;
    total_sessions: number;
    completed_sessions: number;
    expected_attendees: number;
    actual_attendees: number;
    attendance_rate: number;
  }>;
  facilitator_performance: Array<{
    facilitator_name: string;
    sessions: number;
    expected_attendees: number;
    actual_attendees: number;
    attendance_rate: number;
  }>;
  department_compliance: Array<{
    department: string;
    expected_attendees: number;
    actual_attendees: number;
    attendance_rate: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class TrainingService {
  private readonly apiUrl = '/apiV2/training';
  private currentSessionSubject = new BehaviorSubject<TrainingSession | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Training Session Management
  getTrainingSessions(): Observable<TrainingSession[]> {
    return this.http.get<TrainingSession[]>(`${this.apiUrl}/sessions`);
  }

  getTrainingSession(id: number): Observable<TrainingSession> {
    return this.http.get<TrainingSession>(`${this.apiUrl}/sessions/${id}`);
  }

  createTrainingSession(request: CreateTrainingSessionRequest): Observable<TrainingSession> {
    return this.http.post<TrainingSession>(`${this.apiUrl}/sessions`, request);
  }

  updateTrainingSession(id: number, session: Partial<TrainingSession>): Observable<TrainingSession> {
    return this.http.put<TrainingSession>(`${this.apiUrl}/sessions/${id}`, session);
  }

  deleteTrainingSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/sessions/${id}`);
  }

  // Session Status Management
  startSession(sessionId: number): Observable<TrainingSession> {
    return this.http.put<TrainingSession>(`${this.apiUrl}/sessions/${sessionId}`, { status: 'in-progress' });
  }

  endSession(sessionId: number): Observable<TrainingSession> {
    return this.http.put<TrainingSession>(`${this.apiUrl}/sessions/${sessionId}`, { status: 'completed' });
  }

  // Badge Scanning & Completion
  scanBadgeForCompletion(sessionId: number, badgeNumber: string): Observable<BadgeScanResult> {
    const request = {
      sessionId,
      badgeNumber
    };
    return this.http.post<BadgeScanResult>(`${this.apiUrl}/badge-scans`, request);
  }

  // Legacy method for backward compatibility
  scanBadge(sessionId: number, badgeNumber: string): Observable<BadgeScanResult> {
    return this.scanBadgeForCompletion(sessionId, badgeNumber);
  }

  getSessionAttendance(sessionId: number): Observable<TrainingAttendance[]> {
    return this.http.get<TrainingAttendance[]>(`${this.apiUrl}/sessions/${sessionId}/attendance`);
  }

  removeAttendance(attendanceId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/attendance/${attendanceId}`);
  }

  // Employee Management
  searchEmployees(query: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/employees/search?q=${encodeURIComponent(query)}`);
  }

  getEmployeeByBadge(badgeNumber: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/employees/by-badge/${encodeURIComponent(badgeNumber)}`);
  }

  getAllEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/employees`);
  }

  // Expected Attendees Management
  addExpectedAttendee(sessionId: number, employeeId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sessions/${sessionId}/expected-attendees`, { employeeId });
  }

  removeExpectedAttendee(sessionId: number, employeeId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/sessions/${sessionId}/expected-attendees/${employeeId}`);
  }

  bulkAddExpectedAttendees(sessionId: number, employeeIds: number[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sessions/${sessionId}/expected-attendees/bulk`, { employeeIds });
  }

  // Metrics and Reporting
  getSessionMetrics(sessionId: number): Observable<TrainingMetrics> {
    return this.http.get<TrainingMetrics>(`${this.apiUrl}/sessions/${sessionId}/metrics`);
  }

  getAdminReport(filter?: { dateFrom?: string; dateTo?: string; days?: number }): Observable<TrainingAdminReportSummary> {
    let params = new HttpParams();

    if (filter?.dateFrom) {
      params = params.set('dateFrom', filter.dateFrom);
    }
    if (filter?.dateTo) {
      params = params.set('dateTo', filter.dateTo);
    }
    if (typeof filter?.days === 'number') {
      params = params.set('days', String(filter.days));
    }

    return this.http.get<TrainingAdminReportSummary>(`${this.apiUrl}/reports/summary`, { params });
  }

  exportAttendanceSheet(sessionId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/sessions/${sessionId}/export`, { 
      responseType: 'blob' 
    });
  }

  // Real-time Updates
  setCurrentSession(session: TrainingSession | null): void {
    this.currentSessionSubject.next(session);
  }

  getCurrentSession(): TrainingSession | null {
    return this.currentSessionSubject.value;
  }

  // Utility Methods
  calculateDuration(startTime: string, endTime: string): string {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  }

  isSessionActive(session: TrainingSession): boolean {
    const now = new Date();
    const sessionDate = new Date(session.date);
    const startTime = new Date(`${session.date}T${session.startTime}`);
    const endTime = new Date(`${session.date}T${session.endTime}`);
    
    return now >= startTime && now <= endTime;
  }
}
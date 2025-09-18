import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

@Injectable({
  providedIn: 'root'
})
export class TrainingService {
  private apiUrl = 'training';
  private currentSessionSubject = new BehaviorSubject<TrainingSession | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Training Session Management
  getTrainingSessions(): Observable<TrainingSession[]> {
    return this.http.get<TrainingSession[]>(`${this.apiUrl}/index.php?path=sessions`);
  }

  getTrainingSession(id: number): Observable<TrainingSession> {
    return this.http.get<TrainingSession>(`${this.apiUrl}/index.php?path=sessions&id=${id}`);
  }

  createTrainingSession(request: CreateTrainingSessionRequest): Observable<TrainingSession> {
    return this.http.post<TrainingSession>(`${this.apiUrl}/index.php?path=sessions`, request);
  }

  updateTrainingSession(id: number, session: Partial<TrainingSession>): Observable<TrainingSession> {
    return this.http.put<TrainingSession>(`${this.apiUrl}/index.php?path=sessions&id=${id}`, session);
  }

  deleteTrainingSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/index.php?path=sessions&id=${id}`);
  }

  // Session Status Management
  startSession(sessionId: number): Observable<TrainingSession> {
    return this.http.put<TrainingSession>(`${this.apiUrl}/index.php?path=sessions&id=${sessionId}`, { status: 'in-progress' });
  }

  endSession(sessionId: number): Observable<TrainingSession> {
    return this.http.put<TrainingSession>(`${this.apiUrl}/index.php?path=sessions&id=${sessionId}`, { status: 'completed' });
  }

  // Badge Scanning & Completion
  scanBadgeForCompletion(sessionId: number, badgeNumber: string): Observable<BadgeScanResult> {
    const request = {
      sessionId,
      badgeNumber
    };
    return this.http.post<BadgeScanResult>(`${this.apiUrl}/index.php?path=badge-scan`, request);
  }

  // Legacy method for backward compatibility
  scanBadge(sessionId: number, badgeNumber: string): Observable<BadgeScanResult> {
    return this.scanBadgeForCompletion(sessionId, badgeNumber);
  }

  getSessionAttendance(sessionId: number): Observable<TrainingAttendance[]> {
    return this.http.get<TrainingAttendance[]>(`${this.apiUrl}/index.php?path=sessions/attendance&sessionId=${sessionId}`);
  }

  removeAttendance(attendanceId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/index.php?path=attendance&id=${attendanceId}`);
  }

  // Employee Management
  searchEmployees(query: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/index.php?path=employees/search&q=${encodeURIComponent(query)}`);
  }

  getEmployeeByBadge(badgeNumber: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/index.php?path=employees/badge&badgeNumber=${badgeNumber}`);
  }

  getAllEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/index.php?path=employees`);
  }

  // Expected Attendees Management
  addExpectedAttendee(sessionId: number, employeeId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/index.php?path=sessions/expected-attendees&sessionId=${sessionId}`, { employeeId });
  }

  removeExpectedAttendee(sessionId: number, employeeId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/index.php?path=sessions/expected-attendees&sessionId=${sessionId}&employeeId=${employeeId}`);
  }

  bulkAddExpectedAttendees(sessionId: number, employeeIds: number[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/index.php?path=sessions/expected-attendees/bulk&sessionId=${sessionId}`, { employeeIds });
  }

  // Metrics and Reporting
  getSessionMetrics(sessionId: number): Observable<TrainingMetrics> {
    return this.http.get<TrainingMetrics>(`${this.apiUrl}/index.php?path=sessions/metrics&sessionId=${sessionId}`);
  }

  exportAttendanceSheet(sessionId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/index.php?path=sessions/export&sessionId=${sessionId}`, { 
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
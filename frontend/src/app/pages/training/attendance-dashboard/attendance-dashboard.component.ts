import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { TrainingService } from '../services/training.service';
import { 
  TrainingSession, 
  TrainingAttendance, 
  Employee,
  TrainingMetrics 
} from '../models/training.model';

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attendance-dashboard.component.html',
  styleUrls: ['./attendance-dashboard.component.scss']
})
export class AttendanceDashboardComponent implements OnInit, OnDestroy {
  
  session: TrainingSession | null = null;
  completedAttendees: TrainingAttendance[] = [];
  pendingAttendees: Employee[] = [];
  metrics: TrainingMetrics | null = null;
  
  isLoading = false;
  
  // Auto-refresh
  private refreshSubscription?: Subscription;
  private attendanceSubscription?: Subscription;
  private metricsSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 3000; // 3 seconds for dashboard
  
  // Display options
  showCompletedOnly = false;
  showPendingOnly = false;
  sortBy: 'name' | 'time' | 'department' = 'time';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trainingService: TrainingService
  ) {}

  ngOnInit(): void {
    const sessionId = Number(this.route.snapshot.paramMap.get('sessionId'));
    if (sessionId) {
      this.loadDashboardData(sessionId);
    } else {
      this.router.navigate(['/training/live']);
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.attendanceSubscription?.unsubscribe();
    this.metricsSubscription?.unsubscribe();
  }

  private loadDashboardData(sessionId: number): void {
    this.isLoading = true;
    
    // Load session details
    this.trainingService.getTrainingSession(sessionId).subscribe({
      next: (rawSession) => {
        this.session = this.mapSessionData(rawSession);
        this.loadAttendanceData();
        this.loadMetrics();
        this.startAutoRefresh();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading session:', error);
        this.isLoading = false;
      }
    });
  }

  private mapSessionData(rawData: any): TrainingSession {
    // Map snake_case backend fields to camelCase frontend fields
    return {
      id: rawData.id,
      title: rawData.title,
      description: rawData.description,
      purpose: rawData.purpose,
      date: rawData.date,
      startTime: rawData.start_time || rawData.startTime,
      endTime: rawData.end_time || rawData.endTime,
      duration: rawData.duration,
      durationMinutes: rawData.duration_minutes || rawData.durationMinutes || 0,
      location: rawData.location,
      facilitatorName: rawData.facilitator_name || rawData.facilitatorName,
      facilitatorSignature: rawData.facilitator_signature || rawData.facilitatorSignature,
      status: rawData.status,
      createdBy: rawData.created_by || rawData.createdBy,
      createdDate: rawData.created_date || rawData.createdDate,
      expectedAttendees: rawData.expectedAttendees || rawData.expected_attendees || [],
      actualAttendees: rawData.actualAttendees || rawData.actual_attendees || []
    };
  }

  private loadAttendanceData(): void {
    if (!this.session) return;

    this.attendanceSubscription?.unsubscribe();
    
    // Load completed attendees
    this.attendanceSubscription = this.trainingService.getSessionAttendance(this.session.id).subscribe({
      next: (attendance) => {
        // Process attendance data and calculate duration if missing
        this.completedAttendees = attendance.map(att => {
          // Calculate duration if not provided by backend
          if (att.attendanceDuration === null || att.attendanceDuration === undefined) {
            att.attendanceDuration = this.calculateAttendanceDuration(att);
          }
          return att;
        });
        this.calculatePendingAttendees();
        this.sortAttendees();
      },
      error: (error) => {
        console.error('Error loading attendance:', error);
      }
    });
  }

  private calculateAttendanceDuration(attendance: TrainingAttendance): number {
    if (!this.session) return 0;
    
    try {
      // For training completion tracking: duration from session start to badge scan time
      if (attendance.signoffTime || attendance.signInTime) {
        const sessionStart = new Date(`${this.session.date}T${this.session.startTime}`);
        // Use signoffTime (badge scan) if available, otherwise use signInTime
        const scanTime = new Date(attendance.signoffTime || attendance.signInTime);
        
        const diffMs = scanTime.getTime() - sessionStart.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        
        // Return duration from session start to scan, capped at reasonable maximum
        return Math.max(0, Math.min(diffMinutes, this.session.durationMinutes + 60)); // Allow 1 hour buffer
      }
      
      return 0; // No scan time available
    } catch (error) {
      console.error('Error calculating attendance duration:', error);
      return 0;
    }
  }

  private loadMetrics(): void {
    if (!this.session) return;

    this.metricsSubscription?.unsubscribe();
    
    this.metricsSubscription = this.trainingService.getSessionMetrics(this.session.id).subscribe({
      next: (metrics) => {
        this.metrics = metrics;
      },
      error: (error) => {
        console.error('Error loading metrics:', error);
      }
    });
  }

  private calculatePendingAttendees(): void {
    if (!this.session) return;
    
    const completedIds = this.completedAttendees.map(a => a.employeeId);
    this.pendingAttendees = this.session.expectedAttendees
      .map(a => a.employee)
      .filter(emp => !completedIds.includes(emp.id));
  }

  private sortAttendees(): void {
    // Sort completed attendees
    this.completedAttendees.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'name':
          const nameA = `${a.employee.lastName}, ${a.employee.firstName}`;
          const nameB = `${b.employee.lastName}, ${b.employee.firstName}`;
          comparison = nameA.localeCompare(nameB);
          break;
        case 'time':
          comparison = new Date(a.signInTime).getTime() - new Date(b.signInTime).getTime();
          break;
        case 'department':
          comparison = a.employee.department.localeCompare(b.employee.department);
          break;
      }
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    // Sort pending attendees
    this.pendingAttendees.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'name':
          const nameA = `${a.lastName}, ${a.firstName}`;
          const nameB = `${b.lastName}, ${b.firstName}`;
          comparison = nameA.localeCompare(nameB);
          break;
        case 'department':
          comparison = a.department.localeCompare(b.department);
          break;
        default:
          comparison = 0;
      }
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  private startAutoRefresh(): void {
    if (this.session?.status === 'completed' || this.session?.status === 'cancelled') {
      return;
    }
    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      if (this.session && !this.isLoading) {
        if (this.session.status === 'completed' || this.session.status === 'cancelled') {
          this.stopAutoRefresh();
          return;
        }
        this.loadAttendanceData();
        this.loadMetrics();
      }
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  // Public methods
  refresh(): void {
    if (this.session) {
      this.loadAttendanceData();
      this.loadMetrics();
    }
  }

  setSortBy(sortBy: 'name' | 'time' | 'department'): void {
    if (this.sortBy === sortBy) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortDirection = 'asc';
    }
    this.sortAttendees();
  }

  toggleView(view: 'all' | 'completed' | 'pending'): void {
    this.showCompletedOnly = view === 'completed';
    this.showPendingOnly = view === 'pending';
  }

  // Export functionality
  exportAttendanceSheet(): void {
    if (!this.session) return;
    
    this.trainingService.exportAttendanceSheet(this.session.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.session!.title}_Attendance_${this.session!.date}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting attendance sheet:', error);
      }
    });
  }

  printAttendanceReport(): void {
    if (!this.session) return;

    const completedRows = this.getFilteredCompletedAttendees()
      .map(att => `
        <tr>
          <td>${att.employee.firstName} ${att.employee.lastName}</td>
          <td>${att.employee.department || att.employee.title || 'N/A'}</td>
          <td>${this.formatTime(att.signInTime)}</td>
        </tr>
      `)
      .join('');

    const pendingRows = this.getFilteredPendingAttendees()
      .map(emp => `
        <tr>
          <td>${emp.firstName} ${emp.lastName}</td>
          <td>${emp.department || emp.title || 'N/A'}</td>
          <td>Pending</td>
        </tr>
      `)
      .join('');

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      console.error('Unable to open print window. Pop-up may be blocked.');
      return;
    }

    const reportHtml = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Training Attendance Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
          .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
          .report-header img { height: 42px; object-fit: contain; }
          h1 { margin: 0 0 6px; font-size: 24px; }
          .sub { margin: 0 0 18px; color: #4b5563; }
          .meta { margin-bottom: 20px; }
          .meta div { margin: 2px 0; }
          .stats { display: flex; gap: 20px; margin: 12px 0 20px; }
          .stats .item { border: 1px solid #d1d5db; padding: 10px 12px; border-radius: 6px; min-width: 120px; }
          .stats .label { font-size: 12px; color: #6b7280; }
          .stats .value { font-size: 20px; font-weight: 700; }
          h2 { margin: 20px 0 8px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 13px; }
          th { background: #f3f4f6; }
          .muted { color: #6b7280; font-size: 12px; margin-top: 20px; }
          @media print { body { margin: 12px; } }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>Training Attendance Report</h1>
          <img src="${window.location.origin}/assets/images/fi-color.png" alt="The Fi Company" />
        </div>
        <p class="sub">${this.session.title}</p>

        <div class="meta">
          <div><strong>Date:</strong> ${this.formatDate(this.session.date)}</div>
          <div><strong>Time:</strong> ${this.formatTime(this.session.date + 'T' + this.session.startTime)} - ${this.formatTime(this.session.date + 'T' + this.session.endTime)}</div>
          <div><strong>Location:</strong> ${this.session.location || 'N/A'}</div>
          <div><strong>Facilitator:</strong> ${this.session.facilitatorName || 'N/A'}</div>
          ${this.session.description ? `<div><strong>Description:</strong> ${this.session.description}</div>` : ''}
          <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
        </div>

        <div class="stats">
          <div class="item"><div class="label">Expected</div><div class="value">${this.metrics?.totalExpected ?? this.session.expectedAttendees.length}</div></div>
          <div class="item"><div class="label">Completed</div><div class="value">${this.metrics?.completedCount ?? this.completedAttendees.length}</div></div>
          <div class="item"><div class="label">Pending</div><div class="value">${Math.max((this.metrics?.totalExpected ?? this.session.expectedAttendees.length) - (this.metrics?.completedCount ?? this.completedAttendees.length), 0)}</div></div>
          <div class="item"><div class="label">Attendance Rate</div><div class="value">${this.getCompletionRate()}%</div></div>
        </div>

        <h2>Completed Attendees (${this.getFilteredCompletedAttendees().length})</h2>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Sign-off Time</th>
            </tr>
          </thead>
          <tbody>
            ${completedRows || '<tr><td colspan="3">No completed attendees.</td></tr>'}
          </tbody>
        </table>

        <h2>Pending Attendees (${this.getFilteredPendingAttendees().length})</h2>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${pendingRows || '<tr><td colspan="3">No pending attendees.</td></tr>'}
          </tbody>
        </table>

        <p class="muted">This report was generated from the Attendance Dashboard.</p>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  // Navigation
  goToSessions(): void {
    this.router.navigate(['/training/live']);
  }

  goToSignOff(): void {
    if (this.session) {
      this.router.navigate(['/training/sign-off', this.session.id]);
    }
  }

  // Utility methods
  getCompletionRate(): number {
    return this.metrics?.attendanceRate || 0;
  }

  getCompletionRateColor(): string {
    const rate = this.getCompletionRate();
    if (rate >= 90) return 'text-success';
    if (rate >= 70) return 'text-warning';
    return 'text-danger';
  }

  isSessionActive(): boolean {
    return this.session ? this.trainingService.isSessionActive(this.session) : false;
  }

  getSessionStatus(): string {
    if (!this.session) return 'Unknown';
    
    const now = new Date();
    const sessionDate = new Date(this.session.date);
    const startTime = new Date(`${this.session.date}T${this.session.startTime}`);
    const endTime = new Date(`${this.session.date}T${this.session.endTime}`);
    
    if (now < startTime) return 'Scheduled';
    if (now >= startTime && now <= endTime) return 'In Progress';
    if (now > endTime) return 'Completed';
    
    return 'Unknown';
  }

  getStatusClass(): string {
    const status = this.getSessionStatus();
    switch (status) {
      case 'Scheduled': return 'badge bg-primary';
      case 'In Progress': return 'badge bg-success';
      case 'Completed': return 'badge bg-secondary';
      default: return 'badge bg-light';
    }
  }

  formatTime(dateTime: string): string {
    if (!dateTime) return 'N/A';
    
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) {
        console.error('Invalid dateTime:', dateTime);
        return dateTime;
      }
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting dateTime:', dateTime, error);
      return dateTime;
    }
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date:', date);
        return date;
      }
      
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', date, error);
      return date;
    }
  }

  getDepartmentStats(): { department: string; completed: number; total: number; rate: number }[] {
    if (!this.session) return [];
    
    const departmentMap = new Map<string, { completed: number; total: number }>();
    
    // Count expected attendees by department
    this.session.expectedAttendees.forEach(attendee => {
      const dept = attendee.employee.department;
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, { completed: 0, total: 0 });
      }
      departmentMap.get(dept)!.total++;
    });
    
    // Count completed attendees by department
    this.completedAttendees.forEach(attendance => {
      const dept = attendance.employee.department;
      if (departmentMap.has(dept)) {
        departmentMap.get(dept)!.completed++;
      }
    });
    
    return Array.from(departmentMap.entries()).map(([department, stats]) => ({
      department,
      completed: stats.completed,
      total: stats.total,
      rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
    })).sort((a, b) => b.rate - a.rate);
  }

  getFilteredCompletedAttendees(): TrainingAttendance[] {
    if (this.showPendingOnly) return [];
    return this.completedAttendees;
  }

  getFilteredPendingAttendees(): Employee[] {
    if (this.showCompletedOnly) return [];
    return this.pendingAttendees;
  }

  getRefreshInterval(): number {
    return this.REFRESH_INTERVAL / 1000;
  }
}
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
      this.startAutoRefresh();
    } else {
      this.router.navigate(['/training/live']);
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private loadDashboardData(sessionId: number): void {
    this.isLoading = true;
    
    // Load session details
    this.trainingService.getTrainingSession(sessionId).subscribe({
      next: (rawSession) => {
        this.session = this.mapSessionData(rawSession);
        this.loadAttendanceData();
        this.loadMetrics();
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
    
    // Load completed attendees
    this.trainingService.getSessionAttendance(this.session.id).subscribe({
      next: (attendance) => {
        this.completedAttendees = attendance;
        this.calculatePendingAttendees();
        this.sortAttendees();
      },
      error: (error) => {
        console.error('Error loading attendance:', error);
      }
    });
  }

  private loadMetrics(): void {
    if (!this.session) return;
    
    this.trainingService.getSessionMetrics(this.session.id).subscribe({
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
    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      if (this.session && !this.isLoading) {
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
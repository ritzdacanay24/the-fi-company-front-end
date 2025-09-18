import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { TrainingService } from '../services/training.service';
import { TrainingSession } from '../models/training.model';

@Component({
  selector: 'app-live-sessions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './live-sessions.component.html',
  styleUrls: ['./live-sessions.component.scss']
})
export class LiveSessionsComponent implements OnInit, OnDestroy {
  
  liveSessions: any[] = []; // Changed to any[] to handle backend response
  upcomingSessions: any[] = []; // Changed to any[] to handle backend response
  isLoading = false;
  currentTime = new Date();
  isProcessing = false;
  isTrainer = true; // TODO: Get from user service/auth
  
  private refreshSubscription?: Subscription;
  private timeSubscription?: Subscription;
  
  constructor(
    private trainingService: TrainingService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadSessions();
    this.startAutoRefresh();
    this.startTimeUpdater();
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    if (this.timeSubscription) {
      this.timeSubscription.unsubscribe();
    }
  }

  private loadSessions(): void {
    this.isLoading = true;
    this.trainingService.getTrainingSessions().subscribe({
      next: (sessions: any[]) => {
        console.log('Sessions received:', sessions); // Debug log
        this.categorizeSessionsByStatus(sessions);
        // Load attendance counts for each session
        this.loadAttendanceCounts();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading sessions:', error);
        this.isLoading = false;
      }
    });
  }

  private loadAttendanceCounts(): void {
    // Load attendance counts for live sessions
    this.liveSessions.forEach(session => {
      this.trainingService.getSessionAttendance(session.id).subscribe({
        next: (attendance) => {
          session.actualAttendanceCount = attendance.length;
        },
        error: (error) => {
          console.error(`Error loading attendance for session ${session.id}:`, error);
        }
      });
    });

    // Load attendance counts for upcoming sessions
    this.upcomingSessions.forEach(session => {
      this.trainingService.getSessionAttendance(session.id).subscribe({
        next: (attendance) => {
          session.actualAttendanceCount = attendance.length;
        },
        error: (error) => {
          console.error(`Error loading attendance for session ${session.id}:`, error);
        }
      });
    });
  }

  private categorizeSessionsByStatus(sessions: any[]): void {
    const now = new Date();
    this.liveSessions = [];
    this.upcomingSessions = [];

    console.log('Categorizing sessions:', sessions);
    console.log('Current time:', now);

    sessions.forEach(session => {
      // Map the backend response to our expected format
      const mappedSession = this.mapSessionFromBackend(session);
      
      console.log('Mapped session:', mappedSession);
      
      const sessionDate = new Date(mappedSession.date);
      const startTime = new Date(`${mappedSession.date}T${mappedSession.startTime}`);
      const endTime = new Date(`${mappedSession.date}T${mappedSession.endTime}`);
      
      console.log('Session times:', {
        sessionDate,
        startTime,
        endTime,
        now,
        isLive: now >= startTime && now <= endTime,
        isUpcoming: startTime > now && (startTime.getTime() - now.getTime()) <= 4 * 60 * 60 * 1000,
        timeDiff: (startTime.getTime() - now.getTime()) / (1000 * 60 * 60) // hours
      });
      
      // Session is live if current time is between start and end time
      if (now >= startTime && now <= endTime) {
        console.log('Adding to live sessions:', mappedSession.title);
        this.liveSessions.push(mappedSession);
      }
      // Session is upcoming if it starts within the next 4 hours
      else if (startTime > now && (startTime.getTime() - now.getTime()) <= 4 * 60 * 60 * 1000) {
        console.log('Adding to upcoming sessions:', mappedSession.title);
        this.upcomingSessions.push(mappedSession);
      }
      // Show all sessions for now (debug)
      else if (startTime > now) {
        console.log('Session is in future but beyond 4 hours:', mappedSession.title, 'Hours from now:', (startTime.getTime() - now.getTime()) / (1000 * 60 * 60));
        // Temporarily add to upcoming for debugging
        this.upcomingSessions.push(mappedSession);
      }
      else {
        console.log('Session is in the past:', mappedSession.title);
      }
    });

    console.log('Final categorization:', {
      liveSessions: this.liveSessions,
      upcomingSessions: this.upcomingSessions
    });

    // Sort by start time
    this.liveSessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
    this.upcomingSessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  private mapSessionFromBackend(backendSession: any): any {
    return {
      id: parseInt(backendSession.id),
      title: backendSession.title,
      description: backendSession.description,
      purpose: backendSession.purpose,
      date: backendSession.date,
      startTime: backendSession.start_time,
      endTime: backendSession.end_time,
      duration: backendSession.duration_minutes ? `${backendSession.duration_minutes}m` : '',
      durationMinutes: parseInt(backendSession.duration_minutes) || 0,
      location: backendSession.location,
      facilitatorName: backendSession.facilitator_name,
      facilitatorSignature: backendSession.facilitator_signature,
      status: backendSession.status,
      createdBy: parseInt(backendSession.created_by),
      createdDate: backendSession.created_date,
      expectedCount: parseInt(backendSession.expected_count) || 0,
      completedCount: parseInt(backendSession.completed_count) || 0,
      expectedAttendees: [], // Will be populated if needed
      actualAttendees: []    // Will be populated if needed
    };
  }

  private startAutoRefresh(): void {
    // Refresh every 2 minutes
    this.refreshSubscription = interval(120000).subscribe(() => {
      this.loadSessions();
    });
  }

  private startTimeUpdater(): void {
    // Update current time every second
    this.timeSubscription = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    });
  }

  joinSession(session: any): void {
    // Navigate to badge sign-off for this session
    this.router.navigate(['../sign-off', session.id], { relativeTo: this.route });
  }

  viewSessionDetails(session: any): void {
    // Navigate to session attendance dashboard
    this.router.navigate(['../attendance', session.id], { relativeTo: this.route });
  }

  getSessionDuration(session: any): string {
    return this.trainingService.calculateDuration(session.startTime, session.endTime);
  }

  getTimeUntilStart(session: any): string {
    const now = new Date();
    const startTime = new Date(`${session.date}T${session.startTime}`);
    const diffMs = startTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Starting now';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Starts in ${hours}h ${minutes}m`;
    } else {
      return `Starts in ${minutes}m`;
    }
  }

  getTimeRemaining(session: any): string {
    const now = new Date();
    const endTime = new Date(`${session.date}T${session.endTime}`);
    const diffMs = endTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Session ended';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  }

  formatTime(time: string): string {
    if (!time) return 'N/A';
    
    try {
      // Handle time format like "09:00:00" or "09:00"
      const timeParts = time.split(':');
      if (timeParts.length >= 2) {
        let hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        // Convert to 12-hour format
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        
        const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
        return `${hours}:${minutesStr} ${ampm}`;
      }
      
      // Fallback: try to create a Date object
      return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      console.error('Error formatting time:', time, error);
      return time; // Return original if formatting fails
    }
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date:', date);
        return date; // Return original if invalid
      }
      
      return dateObj.toLocaleDateString([], { 
        weekday: 'long',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', date, error);
      return date; // Return original if formatting fails
    }
  }

  refreshSessions(): void {
    this.loadSessions();
  }

  getCompletedCount(session: any): number {
    return session.actualAttendanceCount || session.completedCount || 0;
  }

  getExpectedCount(session: any): number {
    return session.expectedCount || 0;
  }

  // Session Management Methods
  startSession(session: any): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.trainingService.startSession(session.id).subscribe({
      next: (updatedSession) => {
        console.log('Session started:', updatedSession);
        // Update the session in our arrays
        this.updateSessionInArrays(updatedSession);
        this.isProcessing = false;
      },
      error: (error) => {
        console.error('Error starting session:', error);
        this.isProcessing = false;
        // TODO: Show error message to user
      }
    });
  }

  endSession(session: any): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.trainingService.endSession(session.id).subscribe({
      next: (updatedSession) => {
        console.log('Session ended:', updatedSession);
        // Update the session in our arrays
        this.updateSessionInArrays(updatedSession);
        this.isProcessing = false;
      },
      error: (error) => {
        console.error('Error ending session:', error);
        this.isProcessing = false;
        // TODO: Show error message to user
      }
    });
  }

  canStartSession(session: any): boolean {
    // Allow starting up to 30 minutes before scheduled time
    const sessionStart = new Date(`${session.date}T${session.startTime}`);
    const thirtyMinutesBefore = new Date(sessionStart.getTime() - 30 * 60000);
    return this.currentTime >= thirtyMinutesBefore;
  }

  viewAttendanceSheet(session: any): void {
    this.router.navigate(['../attendance', session.id], { relativeTo: this.route });
  }

  editSession(session: any): void {
    this.router.navigate(['../setup', session.id], { relativeTo: this.route });
  }

  private updateSessionInArrays(updatedSession: any): void {
    // Remove from current arrays
    this.liveSessions = this.liveSessions.filter(s => s.id !== updatedSession.id);
    this.upcomingSessions = this.upcomingSessions.filter(s => s.id !== updatedSession.id);
    
    // Re-categorize based on new status
    this.categorizeSessionsByStatus([updatedSession]);
  }
}
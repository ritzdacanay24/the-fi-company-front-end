import { Component, OnInit, OnDestroy, ViewChild, ElementRef, TemplateRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TrainingService } from '../services/training.service';
import { 
  TrainingSession, 
  TrainingAttendance, 
  BadgeScanResult, 
  Employee,
  TrainingMetrics 
} from '../models/training.model';

@Component({
  selector: 'app-badge-sign-off',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './badge-sign-off.component.html',
  styleUrls: ['./badge-sign-off.component.scss']
})
export class BadgeSignOffComponent implements OnInit, OnDestroy {
  @ViewChild('badgeInput', { static: false }) badgeInput!: ElementRef<HTMLInputElement>;
  @ViewChild('confirmationModal', { static: true }) confirmationModal!: TemplateRef<any>;
  
  session: TrainingSession | null = null;
  completedAttendees: TrainingAttendance[] = [];
  expectedAttendees: Employee[] = [];
  metrics: TrainingMetrics | null = null;
  
  badgeNumber = '';
  isLoading = false;
  lastScanResult: BadgeScanResult | null = null;
  recentSignOffs: TrainingAttendance[] = [];
  
  // Confirmation dialog state
  selectedEmployee: Employee | null = null;
  pendingBadgeNumber = '';
  modalRef: NgbModalRef | null = null;
  
  // Auto-refresh
  private refreshSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 10000; // 10 seconds
  
  // UI State
  showSuccessMessage = false;
  showErrorMessage = false;
  messageText = '';
  isInputFocused = false;
  
  private modalService = inject(NgbModal);
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trainingService: TrainingService
  ) {}

  ngOnInit(): void {
    const sessionId = Number(this.route.snapshot.paramMap.get('sessionId'));
    if (sessionId) {
      this.loadSession(sessionId);
      this.startAutoRefresh();
    } else {
      this.router.navigate(['/training/live']);
    }
    
    // Focus on badge input
    setTimeout(() => this.focusBadgeInput(), 100);
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private loadSession(sessionId: number): void {
    this.isLoading = true;
    
    this.trainingService.getTrainingSession(sessionId).subscribe({
      next: (rawSession) => {
        // Map backend response to proper format
        this.session = this.mapTrainingSessionData(rawSession);
        this.trainingService.setCurrentSession(this.session);
        this.loadCompletions();
        this.loadMetrics();
        this.isLoading = false;
        // Focus the badge input after session loads and DOM updates
        setTimeout(() => this.focusBadgeInput(), 200);
      },
      error: (error) => {
        console.error('Error loading session:', error);
        this.showMessage('Error loading training session', 'error');
        this.isLoading = false;
      }
    });
  }

  private mapTrainingSessionData(rawData: any): TrainingSession {
    return {
      id: Number(rawData.id),
      title: rawData.title,
      description: rawData.description,
      purpose: rawData.purpose,
      date: rawData.date,
      startTime: rawData.start_time || rawData.startTime,
      endTime: rawData.end_time || rawData.endTime,
      duration: rawData.duration || `${rawData.duration_minutes}m`,
      durationMinutes: Number(rawData.duration_minutes),
      location: rawData.location,
      facilitatorName: rawData.facilitator_name || rawData.facilitatorName,
      facilitatorSignature: rawData.facilitator_signature || rawData.facilitatorSignature,
      status: rawData.status,
      createdBy: Number(rawData.created_by),
      createdDate: rawData.created_date || rawData.createdDate,
      expectedAttendees: rawData.expectedAttendees || [],
      actualAttendees: rawData.actualAttendees || []
    };
  }

  private loadCompletions(): void {
    if (!this.session) return;
    
    this.trainingService.getSessionAttendance(this.session.id).subscribe({
      next: (attendance) => {
        this.completedAttendees = attendance.sort((a, b) => 
          new Date(b.signInTime).getTime() - new Date(a.signInTime).getTime()
        );
        this.recentSignOffs = this.completedAttendees.slice(0, 8);
      },
      error: (error) => {
        console.error('Error loading completions:', error);
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

  onBadgeScanned(): void {
    if (!this.badgeNumber.trim() || !this.session) {
      return;
    }

    this.isLoading = true;
    this.pendingBadgeNumber = this.badgeNumber.trim();

    // First, lookup the employee by badge number
    this.trainingService.getEmployeeByBadge(this.pendingBadgeNumber).subscribe({
      next: (employee) => {
        if (employee) {
          this.selectedEmployee = employee;
          this.badgeNumber = '';
          this.isLoading = false;
          this.showConfirmationModal();
        } else {
          this.showMessage('Badge number not found. Please try again.', 'error');
          this.badgeNumber = '';
          this.isLoading = false;
          this.focusBadgeInput();
        }
      },
      error: (error) => {
        console.error('Error looking up employee:', error);
        this.showMessage('Error looking up employee. Please try again.', 'error');
        this.badgeNumber = '';
        this.isLoading = false;
        this.focusBadgeInput();
      }
    });
  }

  confirmTrainingCompletion(): void {
    if (!this.selectedEmployee || !this.session || !this.pendingBadgeNumber) {
      return;
    }

    this.isLoading = true;

    this.trainingService.scanBadge(this.session.id, this.pendingBadgeNumber).subscribe({
      next: (result) => {
        this.lastScanResult = result;
        this.handleScanResult(result);
        this.hideConfirmationModal();
        this.loadCompletions();
        this.loadMetrics();
        this.isLoading = false;
        // Auto-focus back to badge input for next scan with longer delay for modal
        setTimeout(() => this.focusBadgeInput(), 500);
      },
      error: (error) => {
        console.error('Error completing training:', error);
        this.showMessage('Error completing training. Please try again.', 'error');
        this.hideConfirmationModal();
        this.isLoading = false;
        // Auto-focus back to badge input for retry
        setTimeout(() => this.focusBadgeInput(), 500);
      }
    });
  }

  private showConfirmationModal(): void {
    this.modalRef = this.modalService.open(this.confirmationModal, {
      centered: true,
      backdrop: 'static',
      keyboard: false
    });

    this.modalRef.result.then(
      () => {
        // Modal closed with result
        this.resetConfirmationState();
      },
      () => {
        // Modal dismissed
        this.resetConfirmationState();
        this.focusBadgeInput();
      }
    );
  }

  private hideConfirmationModal(): void {
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }
  }

  private resetConfirmationState(): void {
    this.selectedEmployee = null;
    this.pendingBadgeNumber = '';
  }

  getEmployeePhotoUrl(employee: Employee): string | null {
    if (!employee) return null;
    
    // Check for image field first (from users table)
    if (employee.image && employee.image !== 'https://dashboard.eye-fi.com/attachments/images/employees/default-user.png') {
      return employee.image;
    }
    
    // Check for photoUrl as alternative
    if (employee.photoUrl && employee.photoUrl !== 'https://dashboard.eye-fi.com/attachments/images/employees/default-user.png') {
      return employee.photoUrl;
    }
    
    return null; // Will show initials instead
  }

  onImageError(event: any): void {
    // Hide the image and show initials instead if image fails to load
    event.target.style.display = 'none';
  }

  private handleScanResult(result: BadgeScanResult): void {
    if (result.success && result.employee) {
      const message = result.alreadySignedIn 
        ? `${result.employee.firstName} ${result.employee.lastName} already signed in`
        : `Welcome ${result.employee.firstName} ${result.employee.lastName}!`;
      
      this.showMessage(message, result.alreadySignedIn ? 'warning' : 'success');
    } else {
      this.showMessage(result.message, 'error');
    }
  }

  private showMessage(text: string, type: 'success' | 'error' | 'warning'): void {
    this.messageText = text;
    this.showSuccessMessage = type === 'success';
    this.showErrorMessage = type === 'error';
    
    // Auto-hide message after 3 seconds
    setTimeout(() => {
      this.showSuccessMessage = false;
      this.showErrorMessage = false;
    }, 3000);
  }

  onInputFocus(event: FocusEvent): void {
    const input = event.target as HTMLInputElement;
    input.removeAttribute('readonly');
    this.isInputFocused = true;
  }

  onInputBlur(event: FocusEvent): void {
    this.isInputFocused = false;
  }

  private focusBadgeInput(): void {
    if (this.badgeInput?.nativeElement) {
      console.log('Attempting to focus badge input');
      const input = this.badgeInput.nativeElement;
      
      // Ensure input is visible and enabled
      if (input.offsetParent !== null && !input.disabled) {
        input.focus();
        this.isInputFocused = true; // Update focus state
        console.log('Badge input focused successfully');
        
        // Verify focus was successful, retry if not
        setTimeout(() => {
          if (document.activeElement !== input) {
            console.log('Focus failed, retrying...');
            input.focus();
            this.isInputFocused = document.activeElement === input;
          }
        }, 50);
      } else {
        console.log('Badge input not ready for focus, retrying...');
        // Retry if input not ready
        setTimeout(() => this.focusBadgeInput(), 100);
      }
    } else {
      console.log('Badge input element not found');
    }
  }

  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      if (this.session && !this.isLoading) {
        this.loadCompletions();
        this.loadMetrics();
      }
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  // Manual refresh
  refresh(): void {
    if (this.session) {
      this.loadCompletions();
      this.loadMetrics();
      // Auto-focus back to badge input after refresh
      setTimeout(() => this.focusBadgeInput(), 100);
    }
  }

  // Navigation
  goToSessions(): void {
    this.router.navigate(['/training/live']);
  }

  goToAttendanceDashboard(): void {
    if (this.session) {
      this.router.navigate(['/training/attendance', this.session.id]);
    }
  }

  // Helper methods
  getCompletionStatusClass(employee: Employee): string {
    const hasCompleted = this.completedAttendees.some(a => a.employeeId === employee.id);
    const isExpected = this.session?.expectedAttendees.some(a => a.employeeId === employee.id);
    
    if (hasCompleted) return 'status-completed';
    if (isExpected) return 'status-pending';
    return 'status-unexpected';
  }

  getAttendanceRate(): number {
    return this.metrics?.attendanceRate || 0;
  }

  isSessionActive(): boolean {
    return this.session ? this.trainingService.isSessionActive(this.session) : false;
  }

  formatTime(dateTime: string): string {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusDisplayText(status: string): string {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }
}

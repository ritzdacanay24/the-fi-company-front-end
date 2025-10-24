import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, timer } from 'rxjs';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from '@app/core/services/auth.service';
import { THE_FI_COMPANY_CURRENT_USER } from '@app/core/guards/admin.guard';
import { SharedHeaderComponent } from '../shared-header/shared-header.component';
import { TemporaryLoginComponent } from '../temporary-login/temporary-login.component';

@Component({
  selector: 'app-public-form-wrapper',
  standalone: true,
  imports: [
    CommonModule,
    SharedHeaderComponent,
    TemporaryLoginComponent
  ],
  templateUrl: './public-form-wrapper.component.html'
})
export class PublicFormWrapperComponent implements OnInit, OnDestroy {
  @Input() pageTitle: string = 'Public Form';
  @Input() pageDescription: string = 'Complete the form below';
  @Input() pageIcon: string = 'mdi-form-select';
  @Input() formTitle: string = 'Temporary Login';
  @Input() formDescription: string = 'Enter your credentials for temporary access.';

  @Output() authenticationComplete = new EventEmitter<any>();
  @Output() userLoggedOut = new EventEmitter<void>();

  onGoToFormsMenu(){}

  // Authentication state
  isAuthenticated = false;
  currentUser: any = null;
  hasValidUserImage = false;

  // Session management
  sessionTimer: Subscription | null = null;
  sessionTimeRemaining = 0;
  // DISABLED: Auto logout timer - users will manually log out
  // readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  // Inactivity tracking
  lastActivity = Date.now();
  // DISABLED: Inactivity timeout - users will manually log out
  // readonly INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minute

  constructor(
    private authService: AuthenticationService,
    private router: Router,
    private toastrService: ToastrService
  ) {}

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  ngOnInit(): void {
    this.checkExistingAuthentication();
  }

  checkExistingAuthentication(): void {
    try {
      const storedUser = localStorage.getItem(THE_FI_COMPANY_CURRENT_USER);
      if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        const user = JSON.parse(storedUser);
        if (user && user.token) {
          // Session never expires - users will manually log out
          this.isAuthenticated = true;
          this.currentUser = user;
          this.hasValidUserImage = !!(user?.image);
          
          // DISABLED: Session timeout check
          // No timer or inactivity tracking needed
          
          // Emit authentication event to parent component
          this.authenticationComplete.emit(user);
          
          console.log('Found existing valid session, user remains authenticated (no auto-logout)');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking existing authentication:', error);
      localStorage.removeItem(THE_FI_COMPANY_CURRENT_USER);
      localStorage.removeItem('temp_session_start');
    }
  }

  ngOnDestroy(): void {
    this.clearSessionTimer();
  }

  onLoginSuccess(user: any): void {
    this.isAuthenticated = true;
    this.currentUser = user;
    this.hasValidUserImage = !!(user?.image);
    
    // DISABLED: No session timeout tracking - users will manually log out
    // No timer or inactivity tracking needed
    
    this.authenticationComplete.emit(user);
  }

  onLoginError(error: string): void {
    console.error('Login error:', error);
  }

  onSessionExpired(): void {
    this.logout();
  }

  logout(): void {
    this.clearSessionTimer();
    this.isAuthenticated = false;
    this.currentUser = null;
    this.hasValidUserImage = false;
    localStorage.removeItem(THE_FI_COMPANY_CURRENT_USER);
    // DISABLED: No session start time needed
    // localStorage.removeItem('temp_session_start');
    this.toastrService.info('You have been logged out.', 'Logged Out');
    this.userLoggedOut.emit();
  }

  extendSession(): void {
    // DISABLED: Session extension not needed - no auto logout
    // Users can stay logged in indefinitely until manual logout
    this.toastrService.info('Auto logout is disabled. Please log out manually when done.', 'Info');
  }

  goToFormsMenu(): void {
    this.router.navigate(['/forms']);
  }

  onUserImageError(event: any): void {
    this.hasValidUserImage = false;
    if (event.target) {
      event.target.style.display = 'none';
    }
  }

  // Session Management
  private startSessionTimer(resetTime: boolean = true): void {
    // DISABLED: Auto logout timer removed - users will manually log out
    // Session never expires
  }

  private clearSessionTimer(): void {
    if (this.sessionTimer) {
      this.sessionTimer.unsubscribe();
      this.sessionTimer = null;
    }
  }

  private setupInactivityTracking(): void {
    // DISABLED: Inactivity tracking removed - users will manually log out
  }

  private updateLastActivity(): void {
    // DISABLED: Activity tracking removed - users will manually log out
  }

  getTimeRemainingFormatted(): string {
    // DISABLED: No timer, return empty or informational message
    return 'No auto-logout';
  }

  getInactivityTimeRemainingFormatted(): string {
    // DISABLED: No inactivity timeout
    return 'No timeout';
  }
}

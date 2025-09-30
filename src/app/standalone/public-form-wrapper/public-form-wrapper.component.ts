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
  readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  // Inactivity tracking
  lastActivity = Date.now();
  readonly INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minute

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
          // Check if session is still valid
          const sessionStart = localStorage.getItem('temp_session_start');
          if (sessionStart) {
            const elapsed = Date.now() - parseInt(sessionStart);
            if (elapsed < this.SESSION_TIMEOUT) {
              this.isAuthenticated = true;
              this.currentUser = user;
              this.hasValidUserImage = !!(user?.image);
              // Calculate remaining time based on elapsed time
              const elapsed = Date.now() - parseInt(sessionStart);
              const remaining = Math.max(0, this.SESSION_TIMEOUT - elapsed);
              this.sessionTimeRemaining = Math.ceil(remaining / 1000);
              
              if (this.sessionTimeRemaining > 0) {
                this.startSessionTimer(false); // Don't reset time, use calculated remaining time
              } else {
                this.logout();
                return;
              }
              this.setupInactivityTracking();
              this.updateLastActivity();
              
              // Emit authentication event to parent component
              this.authenticationComplete.emit(user);
              
              console.log('Found existing valid session, user remains authenticated');
              return;
            } else {
              console.log('Existing session has expired, clearing storage');
              localStorage.removeItem(THE_FI_COMPANY_CURRENT_USER);
              localStorage.removeItem('temp_session_start');
            }
          }
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
    
    // Store session start time for persistence across components
    const sessionStartTime = Date.now().toString();
    localStorage.setItem('temp_session_start', sessionStartTime);
    
    this.startSessionTimer();
    this.setupInactivityTracking();
    this.updateLastActivity();
    
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
    localStorage.removeItem('temp_session_start');
    this.toastrService.info('You have been logged out.', 'Logged Out');
    this.userLoggedOut.emit();
  }

  extendSession(): void {
    this.clearSessionTimer();
    
    // Reset session start time
    const sessionStartTime = Date.now().toString();
    localStorage.setItem('temp_session_start', sessionStartTime);
    
    this.startSessionTimer();
    this.updateLastActivity();
    this.toastrService.success('Session extended successfully!', 'Session Extended');
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
    if (resetTime) {
      this.sessionTimeRemaining = this.SESSION_TIMEOUT / 1000;
    }
    this.sessionTimer = timer(0, 1000).subscribe(() => {
      this.sessionTimeRemaining--;
      if (this.sessionTimeRemaining <= 0) {
        this.logout();
      }
    });
  }

  private clearSessionTimer(): void {
    if (this.sessionTimer) {
      this.sessionTimer.unsubscribe();
      this.sessionTimer = null;
    }
  }

  private setupInactivityTracking(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, () => this.updateLastActivity(), true);
    });
  }

  private updateLastActivity(): void {
    this.lastActivity = Date.now();
  }

  getTimeRemainingFormatted(): string {
    const minutes = Math.floor(this.sessionTimeRemaining / 60);
    const seconds = this.sessionTimeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getInactivityTimeRemainingFormatted(): string {
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    const remaining = Math.max(0, this.INACTIVITY_TIMEOUT - timeSinceLastActivity);
    const seconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

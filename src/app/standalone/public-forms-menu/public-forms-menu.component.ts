import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SharedHeaderComponent } from '../shared-header/shared-header.component';
import { AuthenticationService } from '@app/core/services/auth.service';
import { THE_FI_COMPANY_CURRENT_USER } from '@app/core/guards/admin.guard';

@Component({
  selector: 'app-public-forms-menu',
  standalone: true,
  imports: [CommonModule, SharedHeaderComponent],
  templateUrl: './public-forms-menu.component.html',
  styleUrls: ['./public-forms-menu.component.scss']
})
export class PublicFormsMenuComponent implements OnInit, OnDestroy {
  
  // Header properties
  pageTitle = 'Public Forms Portal';
  pageDescription = 'Quick access to standalone forms and data entry tools';
  pageIcon = 'mdi-view-grid';
  
  // Authentication properties - check for existing authentication
  isAuthenticated = false;
  currentUser: any = null;
  hasValidUserImage = false;
  sessionTimeRemaining = 0;
  inactivityTimeRemaining = 0;
  
  private sessionTimer: any;
  private readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  private readonly INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minute
  private lastActivity = Date.now();
  private sessionStartTime = 0;

  constructor(
    private router: Router,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.checkExistingAuthentication();
  }

  ngOnDestroy(): void {
    this.clearSessionTimer();
  }

  checkExistingAuthentication(): void {
    try {
      const storedUser = localStorage.getItem(THE_FI_COMPANY_CURRENT_USER);
      if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        const user = JSON.parse(storedUser);
        if (user && user.token) {
          this.isAuthenticated = true;
          this.currentUser = user;
          this.hasValidUserImage = !!(user?.image);
          
          // Check if session is still valid
          const sessionStart = localStorage.getItem('temp_session_start');
          if (sessionStart) {
            const elapsed = Date.now() - parseInt(sessionStart);
            if (elapsed < this.SESSION_TIMEOUT) {
              this.sessionStartTime = parseInt(sessionStart);
              this.startSessionTimer();
              console.log('Found existing valid session, user remains authenticated');
            } else {
              console.log('Existing session has expired, logging out');
              this.logout();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing authentication:', error);
    }
  }

  startSessionTimer(): void {
    this.clearSessionTimer();
    
    this.sessionTimer = setInterval(() => {
      const elapsed = Date.now() - this.sessionStartTime;
      const remaining = Math.max(0, this.SESSION_TIMEOUT - elapsed);
      this.sessionTimeRemaining = Math.ceil(remaining / 1000);
      
      if (remaining <= 0) {
        this.onSessionExpired();
      }
      
      // Update inactivity time
      const timeSinceLastActivity = Date.now() - this.lastActivity;
      this.inactivityTimeRemaining = Math.max(0, this.INACTIVITY_TIMEOUT - timeSinceLastActivity);
      
      if (timeSinceLastActivity >= this.INACTIVITY_TIMEOUT) {
        console.log('Session expired due to inactivity');
        this.onSessionExpired();
      }
    }, 1000);
  }

  clearSessionTimer(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  onSessionExpired(): void {
    console.log('Session expired');
    this.logout();
  }

  logout(): void {
    this.clearSessionTimer();
    this.isAuthenticated = false;
    this.currentUser = null;
    this.hasValidUserImage = false;
    localStorage.removeItem(THE_FI_COMPANY_CURRENT_USER);
    localStorage.removeItem('temp_session_start');
    console.log('User logged out from forms menu');
  }

  extendSession(): void {
    // Reset session timer
    this.sessionStartTime = Date.now();
    this.lastActivity = Date.now();
    localStorage.setItem('temp_session_start', this.sessionStartTime.toString());
    console.log('Session extended');
  }

  onUserImageError(event: any): void {
    this.hasValidUserImage = false;
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

  navigateToForm(formId: string): void {
    switch (formId) {
      case 'ul-usage':
        this.router.navigate(['/standalone/ul-usage']);
        break;
      case 'igt-serial':
        this.router.navigate(['/standalone/igt-serial']);
        break;
      case 'safety-incident':
        this.router.navigate(['/standalone/safety-incident']);
        break;
      case 'quality-checklist':
        this.router.navigate(['/standalone/quality-checklist']);
        break;
      case 'maintenance-request':
        this.router.navigate(['/standalone/maintenance-request']);
        break;
      case 'training-record':
        this.router.navigate(['/standalone/training-record']);
        break;
      default:
        console.warn(`Form ${formId} not implemented yet`);
    }
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToFormsMenu(): void {
    // Already on forms menu - scroll to top
    this.scrollToTop();
  }
}
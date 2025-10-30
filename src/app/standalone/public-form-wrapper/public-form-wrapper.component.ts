import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '@app/core/services/auth.service';
import { THE_FI_COMPANY_CURRENT_USER } from '@app/core/guards/admin.guard';
import { SharedHeaderComponent } from '../shared-header/shared-header.component';
import { TemporaryLoginComponent } from '../temporary-login/temporary-login.component';

@Component({
  selector: 'app-public-form-wrapper',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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

  @ViewChild('sessionTimeoutModal') sessionTimeoutModal!: TemplateRef<any>;

  onGoToFormsMenu(){}

  // Authentication state
  isAuthenticated = false;
  currentUser: any = null;
  hasValidUserImage = false;

  // Session management - 15 minute inactivity timer
  inactivityTimer: Subscription | null = null;
  lastActivity = Date.now();
  readonly INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 15 minutes
  private readonly LAST_ACTIVITY_KEY = 'temp_last_activity';
  
  // Modal state
  isSessionTimeoutModalOpen = false;
  cardNumber: string = '';
  isReauthenticating = false;

  constructor(
    private authService: AuthenticationService,
    private router: Router,
    private toastrService: ToastrService,
    private modalService: NgbModal
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
          this.isAuthenticated = true;
          this.currentUser = user;
          this.hasValidUserImage = !!(user?.image);
          
          // Restore last activity timestamp from sessionStorage
          const storedLastActivity = sessionStorage.getItem(this.LAST_ACTIVITY_KEY);
          if (storedLastActivity) {
            this.lastActivity = parseInt(storedLastActivity, 10);
            
            // Check if session already expired
            const timeSinceLastActivity = Date.now() - this.lastActivity;
            if (timeSinceLastActivity >= this.INACTIVITY_TIMEOUT) {
              console.log('Session expired before refresh, showing timeout modal');
              // Don't reset timer - show modal immediately after view init
              setTimeout(() => this.showSessionTimeoutModal(), 0);
              return;
            }
          }
          
          // Start 15-minute inactivity timer
          this.setupInactivityTracking();
          
          // Emit authentication event to parent component
          this.authenticationComplete.emit(user);
          
          console.log('Found existing valid session, starting 15-minute inactivity timer');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking existing authentication:', error);
      localStorage.removeItem(THE_FI_COMPANY_CURRENT_USER);
      sessionStorage.removeItem(this.LAST_ACTIVITY_KEY);
    }
  }

  ngOnDestroy(): void {
    this.clearInactivityTimer();
    if (this.isSessionTimeoutModalOpen) {
      this.modalService.dismissAll();
    }
  }

  onLoginSuccess(user: any): void {
    this.isAuthenticated = true;
    this.currentUser = user;
    this.hasValidUserImage = !!(user?.image);
    
    // Start 15-minute inactivity timer
    this.setupInactivityTracking();
    
    this.authenticationComplete.emit(user);
  }

  onLoginError(error: string): void {
    console.error('Login error:', error);
  }

  onSessionExpired(): void {
    // Show modal instead of auto-logout
    this.showSessionTimeoutModal();
  }

  logout(): void {
    this.clearInactivityTimer();
    if (this.isSessionTimeoutModalOpen) {
      this.modalService.dismissAll();
    }
    this.isAuthenticated = false;
    this.currentUser = null;
    this.hasValidUserImage = false;
    localStorage.removeItem(THE_FI_COMPANY_CURRENT_USER);
    sessionStorage.removeItem(this.LAST_ACTIVITY_KEY);
    this.toastrService.info('You have been logged out.', 'Logged Out');
    this.userLoggedOut.emit();
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

  // Session Timeout Modal Methods
  private showSessionTimeoutModal(): void {
    if (this.isSessionTimeoutModalOpen) return;
    
    this.isSessionTimeoutModalOpen = true;
    this.cardNumber = '';
    
    // Check if ViewChild is initialized
    if (!this.sessionTimeoutModal) {
      console.error('Session timeout modal template not found');
      return;
    }
    
    this.modalService.open(this.sessionTimeoutModal, {
      backdrop: 'static',
      keyboard: false,
      centered: true,
      size: 'md'
    });
  }

  async reauthenticateWithCard(): Promise<void> {
    if (!this.cardNumber || this.cardNumber.trim() === '') {
      this.toastrService.warning('Please scan your card number');
      return;
    }

    this.isReauthenticating = true;
    console.log('Attempting to reauthenticate with card number:', this.cardNumber.substring(0, 3) + '...');

    try {
      // Convert Observable to Promise
      const result: any = await firstValueFrom(this.authService.loginWithCardNumber(this.cardNumber.trim()));
      console.log('Reauthentication result:', result);

      if (result?.status_code === 1 && result?.user) {
        const user = result.user;
        console.log('User authenticated:', user.card_number);
        console.log('Current user card:', this.currentUser?.card_number);
        
        // Verify it's the same user
        if (user.card_number === this.currentUser?.card_number) {
          // Ensure user remains authenticated
          this.isAuthenticated = true;
          
          // Reset inactivity timer and save to sessionStorage
          this.lastActivity = Date.now();
          this.saveLastActivity();
          this.setupInactivityTracking();
          
          this.toastrService.success('Session extended successfully', 'Welcome Back');
          this.isSessionTimeoutModalOpen = false;
          this.cardNumber = '';
          
          // Close modal and trigger change detection
          this.modalService.dismissAll();
        } else {
          this.toastrService.error('Card number does not match current user', 'Authentication Failed');
          console.error('Card mismatch - User:', user.card_number, 'Current:', this.currentUser?.card_number);
        }
      } else {
        this.toastrService.error('Invalid card number', 'Authentication Failed');
        console.error('Authentication failed:', result);
      }
    } catch (error) {
      console.error('Reauthentication error:', error);
      this.toastrService.error('Failed to authenticate. Please try again.', 'Error');
    } finally {
      this.isReauthenticating = false;
    }
  }

  logoutFromModal(): void {
    this.logout();
  }

  // Inactivity Tracking
  private setupInactivityTracking(): void {
    // Clear any existing timer
    this.clearInactivityTimer();
    
    // Restore or initialize last activity timestamp
    const storedLastActivity = sessionStorage.getItem(this.LAST_ACTIVITY_KEY);
    if (storedLastActivity) {
      this.lastActivity = parseInt(storedLastActivity, 10);
    } else {
      this.lastActivity = Date.now();
      this.saveLastActivity();
    }
    
    // Check inactivity every second
    this.inactivityTimer = timer(0, 1000).subscribe(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivity;
      
      if (timeSinceLastActivity >= this.INACTIVITY_TIMEOUT) {
        this.onSessionExpired();
        this.clearInactivityTimer(); // Stop checking once modal is shown
      }
    });
    
    // Listen for user activity
    if (typeof window !== 'undefined') {
      ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
        window.addEventListener(event, this.updateLastActivity.bind(this), true);
      });
    }
    
    console.log('Inactivity tracking enabled (15 minute timeout)');
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      this.inactivityTimer.unsubscribe();
      this.inactivityTimer = null;
    }
    
    // Remove event listeners
    if (typeof window !== 'undefined') {
      ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
        window.removeEventListener(event, this.updateLastActivity.bind(this), true);
      });
    }
  }

  private updateLastActivity(): void {
    // Only update if not in timeout modal
    if (!this.isSessionTimeoutModalOpen) {
      this.lastActivity = Date.now();
      this.saveLastActivity();
    }
  }

  private saveLastActivity(): void {
    sessionStorage.setItem(this.LAST_ACTIVITY_KEY, this.lastActivity.toString());
  }

  getTimeRemainingFormatted(): string {
    if (this.isSessionTimeoutModalOpen) {
      return 'Session Paused';
    }
    
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    const remaining = this.INACTIVITY_TIMEOUT - timeSinceLastActivity;
    
    if (remaining <= 0) {
      return '0:00';
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getInactivityTimeRemainingFormatted(): string {
    return this.getTimeRemainingFormatted();
  }
}

import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { SharedModule } from "@app/shared/shared.module";
import { AuthenticationService } from "@app/core/services/auth.service";
import { THE_FI_COMPANY_CURRENT_USER } from "@app/core/guards/admin.guard";

@Component({
  standalone: true,
  imports: [SharedModule, CommonModule],
  selector: "app-safety-incident",
  templateUrl: "./safety-incident.component.html",
  styleUrls: ["./safety-incident.component.scss"],
})
export class SafetyIncidentComponent implements OnInit, OnDestroy {
  title: string = "safety-incident";
  icon = "mdi-account-group";
  
  // Header properties
  pageTitle = "Safety Incident Report";
  pageDescription = "Report safety incidents and workplace hazards";
  pageIcon = "mdi-alert-circle-outline";
  
  // Authentication properties
  isAuthenticated = false;
  currentUser: any = null;
  hasValidUserImage = false;
  sessionTimeRemaining = "00:00";
  inactivityTimeRemaining = "00:00";
  
  private sessionTimer: any;
  private readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  private readonly INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minute
  private lastActivity = Date.now();
  private sessionStartTime = 0;

  constructor(
    public route: ActivatedRoute, 
    public router: Router,
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
            } else {
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
      this.sessionTimeRemaining = this.formatTime(Math.ceil(remaining / 1000));
      
      if (remaining <= 0) {
        this.onSessionExpired();
      }
      
      // Update inactivity time
      const timeSinceLastActivity = Date.now() - this.lastActivity;
      this.inactivityTimeRemaining = this.formatTime(Math.max(0, this.INACTIVITY_TIMEOUT - timeSinceLastActivity));
      
      if (timeSinceLastActivity >= this.INACTIVITY_TIMEOUT) {
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

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  extendSession(): void {
    this.sessionStartTime = Date.now();
    localStorage.setItem('temp_session_start', this.sessionStartTime.toString());
  }

  logout(): void {
    localStorage.removeItem(THE_FI_COMPANY_CURRENT_USER);
    localStorage.removeItem('temp_session_start');
    this.isAuthenticated = false;
    this.currentUser = null;
    this.clearSessionTimer();
    this.router.navigate(['/auth/login']);
  }

  onSessionExpired(): void {
    console.log('Session expired');
    this.clearSessionTimer();
    this.logout();
  }

  goToFormsMenu(): void {
    this.router.navigate(['/forms']);
  }
}

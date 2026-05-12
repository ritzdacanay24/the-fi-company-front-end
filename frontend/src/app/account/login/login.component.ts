import { Component, OnInit, OnDestroy } from "@angular/core";
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";

// Login Auth
import { AuthenticationService } from "../../core/services/auth.service";
import { ToastService } from "./toast-service";
import {
  THE_FI_COMPANY_CURRENT_USER,
  THE_FI_COMPANY_TWOSTEP_TOKEN,
} from "@app/core/guards/admin.guard";
import { TwostepService } from "@app/core/api/twostep/twostep.service";
import { ToastrService } from "ngx-toastr";
import { SupportEntryService } from "@app/core/services/support-entry.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})

/**
 * Login Component
 */
export class LoginComponent implements OnInit, OnDestroy {
  // Login Form
  loginForm!: UntypedFormGroup;
  submitted = false;
  fieldTextType!: boolean;
  error = "";
  returnUrl!: string;
  // set the current year
  year: number = new Date().getFullYear();

  // Header properties for shared header component
  pageTitle = "Sign In";
  pageDescription = "Access your account or browse public forms";
  pageIcon = "mdi-shield-lock";
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
    private formBuilder: UntypedFormBuilder,
    private authenticationService: AuthenticationService,
    private router: Router,
    private route: ActivatedRoute,
    public toastservice: ToastService,
    private twostepService: TwostepService,
    private toastrService: ToastrService,
    private supportEntryService: SupportEntryService,
  ) {
    // redirect to home if already logged in
    if (this.authenticationService.currentUserValue) {
      this.router.navigate(["/operations"]);
    }
  }

  ngOnInit(): void {
    if (localStorage.getItem(THE_FI_COMPANY_CURRENT_USER)) {
      this.router.navigate(["/operations"]);
    }
    
    this.checkExistingAuthentication();
    
    /**
     * Form Validatyion
     */
    this.loginForm = this.formBuilder.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required]],
    });
    // get return url from route parameters or default to '/'
    this.returnUrl =
      this.route.snapshot.queryParams["returnUrl"] || "/operations";
  }

  ngOnDestroy(): void {
    this.clearSessionTimer();
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.loginForm.controls;
  }

  twostep = true;

  /**
   * Check for existing authentication session
   */
  checkExistingAuthentication(): void {
    try {
      const storedUser = localStorage.getItem(THE_FI_COMPANY_CURRENT_USER);
      if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        const user = JSON.parse(storedUser);
        if (user && user.token) {
          this.isAuthenticated = true;
          this.currentUser = user;
          this.hasValidUserImage = !!(user?.image);
          
          const sessionStart = localStorage.getItem('temp_session_start');
          if (sessionStart) {
            const elapsed = Date.now() - parseInt(sessionStart);
            if (elapsed < this.SESSION_TIMEOUT) {
              this.sessionStartTime = parseInt(sessionStart);
              this.startSessionTimer();
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

  logoutSession(): void {
    localStorage.removeItem(THE_FI_COMPANY_CURRENT_USER);
    localStorage.removeItem('temp_session_start');
    this.isAuthenticated = false;
    this.currentUser = null;
    this.clearSessionTimer();
  }

  onSessionExpired(): void {
    console.log('Session expired');
    this.logoutSession();
  }

  goToFormsMenu(): void {
    this.router.navigate(['/forms']);
  }

  /**
   * Form submit
   */
  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.loginForm.invalid) {
      return;
    }

    // Login Api
    this.authenticationService
      .login(this.f["email"].value, this.f["password"].value)
      .subscribe({
        next: async (data: any) => {
          if (data.status == "success") {
            localStorage.setItem("toast", "true");

            localStorage.setItem("token", data.access_token);

            if (data.refresh_token) {
              this.authenticationService.storeRefreshToken(data.refresh_token);
            }

            localStorage.setItem(
              THE_FI_COMPANY_CURRENT_USER,
              JSON.stringify(data.user)
            );

            this.toastrService.clear();
            this.router.navigateByUrl(this.returnUrl);
            return;
          }

          this.error = data?.message || 'Invalid email or password.';
        },
        error: (error: any) => {
          this.error =
            error?.error?.message ||
            error?.message ||
            'Invalid email or password.';
        },
      });
  }

  /**
   * Password Hide/Show
   */
  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

  openSupport(): void {
    void this.supportEntryService.openSupport({ source: 'login' });
  }
}

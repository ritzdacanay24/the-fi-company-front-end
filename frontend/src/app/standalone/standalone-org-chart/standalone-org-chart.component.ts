import { Component, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { UserService } from "@app/core/api/field-service/user.service";
import { OrgChartViewComponent } from "@app/pages/operations/org-chart/org-chart-view/org-chart-view.component";

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, OrgChartViewComponent],
  selector: "app-standalone-org-chart",
  template: `
    <div class="standalone-org-chart-wrapper">
      <div *ngIf="isLoading" class="loading-container">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3">Validating access...</p>
      </div>

      <div *ngIf="!isLoading && errorMessage && !requiresPassword" class="state-card">
        <div class="card shadow-sm mx-auto" style="max-width: 560px;">
          <div class="card-body p-4">
            <div class="d-flex align-items-start">
              <div class="state-icon bg-danger-subtle text-danger me-3">
                <i class="mdi mdi-alert-circle-outline"></i>
              </div>
              <div class="flex-grow-1">
                <h5 class="card-title mb-1">Can’t open this Org Chart</h5>
                <p class="text-muted mb-3">
                  {{ errorMessage }}
                </p>

                <div class="d-flex flex-wrap gap-2">
                  <button class="btn btn-outline-secondary" type="button" (click)="retry()">
                    <i class="mdi mdi-refresh me-1"></i>
                    Try again
                  </button>
                  <a class="btn btn-primary" href="/">
                    <i class="mdi mdi-home-outline me-1"></i>
                    Go to Eyefi
                  </a>
                </div>

                <div class="mt-3">
                  <small class="text-muted">
                    If you were given a share link, ask the sender to confirm it hasn’t expired
                    and that you also received the password (if enabled).
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!isLoading && requiresPassword" class="password-gate">
        <div class="card shadow-sm mx-auto" style="max-width: 520px;">
          <div class="card-body">
            <h5 class="card-title mb-2">Password Required</h5>
            <p class="text-muted mb-3">This Org Chart link is password protected. Enter the password to continue.</p>

            <div *ngIf="passwordError" class="alert alert-danger">
              {{ passwordError }}
            </div>

            <form (ngSubmit)="submitPassword()">
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input
                  class="form-control"
                  type="password"
                  name="orgChartPassword"
                  [(ngModel)]="passwordInput"
                  autocomplete="current-password"
                  [disabled]="isSubmittingPassword"
                  placeholder="Enter password" />
              </div>

              <div class="d-grid">
                <button class="btn btn-primary" type="submit" [disabled]="isSubmittingPassword || !passwordInput">
                  <span *ngIf="isSubmittingPassword" class="spinner-border spinner-border-sm me-2"></span>
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div *ngIf="!isLoading && !errorMessage && isValidToken">
        <div class="header-bar">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h4 class="mb-0">The Fi Company - Organization Chart</h4>
              <small class="text-muted">Shared View (Read-Only)</small>
            </div>
            <div class="d-flex align-items-center gap-2">
              <div class="btn-group btn-group-sm" role="group" aria-label="Location">
                <button
                  type="button"
                  class="btn"
                  [ngClass]="selectedLocation === 'all' ? 'btn-primary' : 'btn-outline-primary'"
                  (click)="setLocation('all')">
                  All
                </button>
                <button
                  type="button"
                  class="btn"
                  [ngClass]="selectedLocation === 'seattle' ? 'btn-primary' : 'btn-outline-primary'"
                  (click)="setLocation('seattle')">
                  Seattle
                </button>
                <button
                  type="button"
                  class="btn"
                  [ngClass]="selectedLocation === 'lasVegas' ? 'btn-primary' : 'btn-outline-primary'"
                  (click)="setLocation('lasVegas')">
                  Las Vegas
                </button>
              </div>

              <!-- <button class="btn btn-outline-primary btn-sm d-flex align-items-center" (click)="toggleLayout()" 
                      [title]="isHorizontalLayout ? 'Switch to Vertical Layout' : 'Switch to Horizontal Layout'">
                <i class="mdi me-1" [ngClass]="isHorizontalLayout ? 'mdi-view-sequential' : 'mdi-view-parallel'"></i>
                {{isHorizontalLayout ? 'Vertical' : 'Horizontal'}}
              </button> -->
            </div>
          </div>
        </div>
        
        <app-org-chart-view [readOnly]="true" [showSearch]="false" [isHorizontalLayout]="isHorizontalLayout"></app-org-chart-view>
      </div>
    </div>
  `,
  styles: [`
    .standalone-org-chart-wrapper {
      min-height: 100vh;
      background: #f8f9fa;
    }

    .state-card,
    .password-gate {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }

    .state-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex: 0 0 auto;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }

    .header-bar {
      background: white;
      padding: 1.5rem 2rem;
      border-bottom: 2px solid #e9ecef;
      margin-bottom: 1rem;
      text-align: center;
    }

    .header-bar h4 {
      color: #495057;
      font-weight: 600;
    }
  `]
})
export class StandaloneOrgChartComponent implements OnInit {
  @ViewChild(OrgChartViewComponent) private orgChartView?: OrgChartViewComponent;

  isLoading = true;
  isValidToken = false;
  errorMessage = "";
  token = "";
  isHorizontalLayout = false;
  requiresPassword = false;
  passwordInput = "";
  passwordError = "";
  isSubmittingPassword = false;
  selectedLocation: 'all' | 'seattle' | 'lasVegas' = 'all';

  constructor(
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.validateTokenAndLoadChart();
      } else {
        this.errorMessage = "No access token provided";
        this.isLoading = false;
      }
    });
  }

  toggleLayout() {
    this.isHorizontalLayout = !this.isHorizontalLayout;
  }

  setLocation(location: 'all' | 'seattle' | 'lasVegas') {
    this.selectedLocation = location;

    // 416 = Las Vegas root (requested)
    // 551 = Seattle root (requested)
    const focusUserId = location === 'lasVegas' ? 416 : location === 'seattle' ? 551 : null;

    if (this.orgChartView) {
      this.orgChartView.filterChart(focusUserId);

      // When viewing All, expand everything for easier browsing.
      if (location === 'all') {
        setTimeout(() => this.orgChartView?.expandAllNodes(), 0);
      }
    }
  }

  retry() {
    if (!this.token) return;
    this.isLoading = true;
    this.isValidToken = false;
    this.errorMessage = "";
    this.passwordError = "";
    this.requiresPassword = false;
    this.validateTokenAndLoadChart();
  }

  async submitPassword() {
    if (!this.passwordInput || this.isSubmittingPassword) return;

    this.isSubmittingPassword = true;
    try {
      await this.validateTokenAndLoadChart(this.passwordInput);
    } finally {
      this.isSubmittingPassword = false;
    }
  }

  async validateTokenAndLoadChart(password?: string) {
    try {
      this.errorMessage = "";
      this.passwordError = "";
      const response = await this.userService.validateOrgChartToken(this.token, password).toPromise();

      console.log('Token validation response:', response);

      if (response?.isValid) {
        this.isValidToken = true;
        this.requiresPassword = false;
        this.isLoading = false;
        // The org-chart-view component will handle loading its own data

        // Apply default location filter after the child chart initializes.
        // (No-op if chart isn't ready yet.)
        setTimeout(() => this.setLocation(this.selectedLocation), 0);
      } else {
        this.isValidToken = false;

        if (response?.requiresPassword) {
          this.requiresPassword = true;
          this.passwordError = response?.error || "Password required";
          this.isLoading = false;
          return;
        }

        this.requiresPassword = false;
        this.errorMessage = response?.error || "Invalid or expired access token";
        this.isLoading = false;
      }
    } catch (error) {
      console.error("Error validating token:", error);
      this.requiresPassword = false;
      this.errorMessage = "Invalid or expired access token";
      this.isLoading = false;
    }
  }
}

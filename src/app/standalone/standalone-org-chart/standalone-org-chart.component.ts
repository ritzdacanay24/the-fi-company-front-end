import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { UserService } from "@app/core/api/field-service/user.service";
import { OrgChartViewComponent } from "@app/pages/operations/org-chart/org-chart-view/org-chart-view.component";

@Component({
  standalone: true,
  imports: [CommonModule, OrgChartViewComponent],
  selector: "app-standalone-org-chart",
  template: `
    <div class="standalone-org-chart-wrapper">
      <div *ngIf="isLoading" class="loading-container">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3">Validating access...</p>
      </div>

      <div *ngIf="errorMessage" class="alert alert-danger m-4">
        {{ errorMessage }}
      </div>

      <div *ngIf="!isLoading && !errorMessage && isValidToken">
        <div class="header-bar">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h4 class="mb-0">The Fi Company - Organization Chart</h4>
              <small class="text-muted">Shared View (Read-Only)</small>
            </div>
            <button class="btn btn-outline-primary btn-sm d-flex align-items-center" (click)="toggleLayout()" 
                    [title]="isHorizontalLayout ? 'Switch to Vertical Layout' : 'Switch to Horizontal Layout'">
              <i class="mdi me-1" [ngClass]="isHorizontalLayout ? 'mdi-view-sequential' : 'mdi-view-parallel'"></i>
              {{isHorizontalLayout ? 'Vertical' : 'Horizontal'}}
            </button>
          </div>
        </div>
        
        <app-org-chart-view [readOnly]="true" [isHorizontalLayout]="isHorizontalLayout"></app-org-chart-view>
      </div>
    </div>
  `,
  styles: [`
    .standalone-org-chart-wrapper {
      min-height: 100vh;
      background: #f8f9fa;
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
  isLoading = true;
  isValidToken = false;
  errorMessage = "";
  token = "";
  isHorizontalLayout = false;

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

  async validateTokenAndLoadChart() {
    try {
      const response = await this.userService.validateOrgChartToken(this.token).toPromise();
      
      console.log('Token validation response:', response);
      
      if (response && response.isValid) {
        this.isValidToken = true;
        this.isLoading = false;
        // The org-chart-view component will handle loading its own data
      } else {
        this.errorMessage = response?.error || "Invalid or expired access token";
        this.isLoading = false;
      }
    } catch (error) {
      console.error("Error validating token:", error);
      this.errorMessage = "Invalid or expired access token";
      this.isLoading = false;
    }
  }
}

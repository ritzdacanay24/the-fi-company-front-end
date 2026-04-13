import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ULLabelService } from '../services/ul-label.service';
import { MockToggleService } from '../services/mock-toggle.service';
import { environment } from '@environments/environment';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-ul-management',
  templateUrl: './ul-management.component.html',
  styleUrls: ['./ul-management.component.scss']
})
export class ULManagementComponent implements OnInit {
  stats = {
    totalLabels: 0,
    activeLabels: 0,
    expiredLabels: 0,
    recentUsages: 0
  };
  
  isLoadingStats = false;
  isProduction = environment.production;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ulLabelService: ULLabelService,
    public mockToggle: MockToggleService
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  loadDashboardStats(): void {
    this.isLoadingStats = true;
    
    // Load basic statistics
    this.ulLabelService.getAllULLabels().subscribe({
      next: (response) => {
        this.isLoadingStats = false;
        if (response.success) {
          const labels = response.data || [];
          this.stats.totalLabels = labels.length;
          this.stats.activeLabels = labels.filter((l: any) => l.status === 'active').length;
          this.stats.expiredLabels = labels.filter((l: any) => l.status === 'expired').length;
        }
      },
      error: (error) => {
        this.isLoadingStats = false;
        console.error('Error loading stats:', error);
      }
    });

    // Load recent usage count
    this.ulLabelService.getAllULLabelUsages().subscribe({
      next: (response) => {
        if (response.success) {
          this.stats.recentUsages = response.data?.length || 0;
        }
      },
      error: (error) => {
        console.error('Error loading usage stats:', error);
      }
    });
  }

  navigateToUpload(): void {
    this.router.navigate(['./upload'], { relativeTo: this.route });
  }

  navigateToLabelsReport(): void {
    this.router.navigate(['./labels-report'], { relativeTo: this.route });
  }

  navigateToUsage(): void {
    this.router.navigate(['./usage'], { relativeTo: this.route });
  }

  navigateToUsageReport(): void {
    this.router.navigate(['./usage-report'], { relativeTo: this.route });
  }

  toggleMockData(): void {
    this.mockToggle.toggleMockData();
    
    // Show notification about the switch
    const newMode = this.mockToggle.currentValue ? 'Mock Data' : 'Real API';
    console.log(`Switched to ${newMode} mode`);
    
    // Reload the dashboard stats with the new data source
    this.loadDashboardStats();
  }
}

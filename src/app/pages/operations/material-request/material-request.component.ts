import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { filter } from 'rxjs/operators';

interface PageInfo {
  title: string;
  description: string;
  icon: string;
  bgClass: string;
  textClass: string;
  showRefresh: boolean;
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-material-request',
  templateUrl: './material-request.component.html',
  styleUrls: []
})
export class MaterialRequestComponent implements OnInit {

  // Badge counts for pending items (optional - can be populated from API)
  pendingValidationCount = 0;
  pendingPickingCount = 0;
  isRefreshing = false;

  private pageInfoMap: Record<string, PageInfo> = {
    'list': {
      title: 'All Material Requests',
      description: 'View and manage all material requests in the system',
      icon: 'mdi mdi-format-list-bulleted',
      bgClass: 'bg-primary bg-gradient',
      textClass: 'text-primary',
      showRefresh: true
    },
    'create': {
      title: 'Create Material Request',
      description: 'Create a new material request for production needs',
      icon: 'mdi mdi-plus-circle',
      bgClass: 'bg-success bg-gradient',
      textClass: 'text-success',
      showRefresh: false
    },
    'edit': {
      title: 'Edit Material Request',
      description: 'Modify and update material request details',
      icon: 'mdi mdi-pencil',
      bgClass: 'bg-info bg-gradient',
      textClass: 'text-info',
      showRefresh: false
    },
    'validate-list': {
      title: 'Material Request Validation',
      description: 'Review and validate pending material requests',
      icon: 'mdi mdi-check-circle',
      bgClass: 'bg-warning bg-gradient',
      textClass: 'text-warning',
      showRefresh: true
    },
    'picking': {
      title: 'Material Request Picking',
      description: 'Process and complete material request picks',
      icon: 'mdi mdi-package-variant',
      bgClass: 'bg-warning bg-gradient',
      textClass: 'text-warning',
      showRefresh: true
    }
  };

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
    // Listen to route changes to update page context
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Optional: Update badge counts when route changes
      // this.loadPendingCounts();
    });

    // Optional: Load badge counts from API
    // this.loadPendingCounts();
  }

  title: string = 'Material Requests';
  icon = 'mdi-clipboard-list';

  /**
   * Check if the current route matches the given route segment
   */
  isActiveRoute(routeSegment: string): boolean {
    const currentRoute = this.router.url;
    return currentRoute.includes(`/material-request/${routeSegment}`);
  }

  /**
   * Get the current page information based on active route
   */
  getCurrentPageInfo(): PageInfo | null {
    const currentRoute = this.router.url;
    
    for (const [route, pageInfo] of Object.entries(this.pageInfoMap)) {
      if (currentRoute.includes(`/material-request/${route}`)) {
        return pageInfo;
      }
    }
    
    // Default to list if no specific route found
    return this.pageInfoMap['list'];
  }

  /**
   * Handle refresh action from the header
   */
  onRefresh(): void {
    this.isRefreshing = true;
    
    // Emit refresh event to child component
    // This could be implemented with a service or event emitter
    // For now, we can trigger a simple page refresh or custom logic
    
    // Simulate refresh delay
    setTimeout(() => {
      this.isRefreshing = false;
      // You can implement custom refresh logic here
      // or communicate with child components via a service
    }, 1000);
  }

  /**
   * Optional method to load pending counts for badges
   */
  // private loadPendingCounts(): void {
  //   // Implement API calls to get pending validation and picking counts
  //   // this.materialRequestService.getPendingValidationCount().subscribe(count => {
  //   //   this.pendingValidationCount = count;
  //   // });
  //   // this.materialRequestService.getPendingPickingCount().subscribe(count => {
  //   //   this.pendingPickingCount = count;
  //   // });
  // }
}

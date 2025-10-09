import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

// Services
import { PriorityDisplayService, PriorityDisplayData } from './services/priority-display.service';
import { DisplayUtilsService } from './services/display-utils.service';

@Component({
  selector: 'app-standalone-shipping-priority-display',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './shipping-priority-display.component.html',
  styleUrls: ['./shipping-priority-display.component.scss']
})
export class StandaloneShippingPriorityDisplayComponent implements OnInit, OnDestroy {
  
  // Reactive data stream
  displayData$ = this.priorityDisplayService.displayData$;
  
  // Current time display
  currentTime: string = '';
  
  // Display mode options
  displayMode: 'single' | 'top3' = 'single';
  
  // Subscriptions management
  private destroy$ = new Subject<void>();
  private timeSubscription?: Subscription;
  private refreshSubscription?: Subscription;
  
  // Auto-refresh configuration
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private priorityDisplayService: PriorityDisplayService,
    private displayUtils: DisplayUtilsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🚀 Shipping Priority Display component initialized');
    console.log('🔗 Current URL:', window.location.href);
    console.log('🔗 Current query params:', this.route.snapshot.queryParams);
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    console.log('🧹 Cleaning up Shipping Priority Display component');
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up subscriptions
    this.timeSubscription?.unsubscribe();
    this.refreshSubscription?.unsubscribe();
    
    // Remove CSS class from body
    document.body.classList.remove('shipping-priority-display');
  }

  /**
   * Initialize the component
   */
  private initializeComponent(): void {
    // Set document title
    document.title = 'Shipping Priority Display | The Fi Company';
    
    // Add CSS class to body for full-screen styling
    document.body.classList.add('shipping-priority-display');
    
    // Setup query parameter subscription for reactive updates
    this.setupQueryParamSubscription();
    
    // Setup time display
    this.setupTimeDisplay();
    
    // Setup auto-refresh
    this.setupAutoRefresh();
    
    // Load initial data
    this.loadInitialData();
  }

  /**
   * Setup reactive subscription to query parameters
   */
  private setupQueryParamSubscription(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const viewParam = params['view'] as 'single' | 'top3';
        console.log('🔗 Query params changed:', params);
        
        if (viewParam && (viewParam === 'single' || viewParam === 'top3')) {
          this.displayMode = viewParam;
          console.log(`🔗 Display mode set from URL: ${this.displayMode}`);
        } else {
          this.displayMode = 'single'; // default
          console.log('🔗 No valid view parameter, using default: single');
        }
        
        // Update the service with the current mode
        this.priorityDisplayService.updateDisplayMode(this.displayMode);
      });
  }

  /**
   * Setup time display that updates every second
   */
  private setupTimeDisplay(): void {
    this.timeSubscription = timer(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = this.displayUtils.formatCurrentTime();
      });
  }

  /**
   * Setup auto-refresh functionality
   */
  private setupAutoRefresh(): void {
    this.refreshSubscription = timer(this.REFRESH_INTERVAL, this.REFRESH_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('🔄 Auto-refreshing priority data...');
        console.log('🔄 Current display mode during auto-refresh:', this.displayMode);
        // Ensure display mode is preserved during auto-refresh
        this.priorityDisplayService.updateDisplayMode(this.displayMode);
        this.priorityDisplayService.loadPriorityData();
      });
  }

  /**
   * Load initial data
   */
  private async loadInitialData(): Promise<void> {
    try {
      console.log('🚀 Loading initial priority data...');
      console.log('🚀 Initial display mode from URL:', this.displayMode);
      
      // Set display mode BEFORE loading data
      this.priorityDisplayService.updateDisplayMode(this.displayMode);
      await this.priorityDisplayService.loadPriorityData();
      
      console.log('✅ Initial data load completed');
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
    }
  }

  /**
   * Manual refresh triggered by user
   */
  async refreshData(): Promise<void> {
    console.log('🔄 Manual refresh triggered');
    console.log('🔄 Current display mode during manual refresh:', this.displayMode);
    // Ensure display mode is preserved during manual refresh
    this.priorityDisplayService.updateDisplayMode(this.displayMode);
    await this.priorityDisplayService.loadPriorityData();
  }

  /**
   * Toggle between single and top3 display modes
   */
  toggleDisplayMode(): void {
    const oldMode = this.displayMode;
    this.displayMode = this.displayMode === 'single' ? 'top3' : 'single';
    console.log(`🔄 Display mode changed from ${oldMode} to: ${this.displayMode}`);
    console.log('🔗 URL before update:', window.location.href);
    
    // Update URL with query parameter
    this.updateUrlWithDisplayMode();
    
    // Update the service
    this.priorityDisplayService.updateDisplayMode(this.displayMode);
  }

  /**
   * Update URL with current display mode as query parameter
   */
  private updateUrlWithDisplayMode(): void {
    try {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { view: this.displayMode },
        queryParamsHandling: 'merge'
      });
      console.log(`� URL updated with view=${this.displayMode}`);
    } catch (error) {
      console.warn('⚠️ Failed to update URL with display mode:', error);
    }
  }

  /**
   * Restore display mode from URL query parameters
   */
  private restoreDisplayMode(): void {
    try {
      const viewParam = this.route.snapshot.queryParams['view'] as 'single' | 'top3';
      if (viewParam && (viewParam === 'single' || viewParam === 'top3')) {
        this.displayMode = viewParam;
        console.log(`� Display mode restored from URL: ${this.displayMode}`);
      } else {
        this.displayMode = 'single'; // default
        console.log('� No view parameter found in URL, using default: single');
      }
    } catch (error) {
      console.warn('⚠️ Failed to restore display mode from URL:', error);
      this.displayMode = 'single'; // fallback to default
    }
  }

  /**
   * Keyboard shortcut handler (Space bar to toggle display mode)
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.code === 'Space' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      this.toggleDisplayMode();
    }
  }

  /**
   * Navigate back to main application
   */
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  // Utility methods delegated to DisplayUtilsService
  formatDate = (date: string | null): string => this.displayUtils.formatDate(date);
  formatTime = (date: string | null): string => this.displayUtils.formatTime(date);
  getStatusBadgeClass = (status: string): string => this.displayUtils.getStatusBadgeClass(status);
  getPriorityBadgeClass = (priority: number): string => this.displayUtils.getPriorityBadgeClass(priority);
  getPriorityRankText = (index: number): string => this.displayUtils.getPriorityRankText(index);
  getPriorityRankClass = (index: number): string => this.displayUtils.getPriorityRankClass(index);
  formatQuantity = (qty: number | string): string => this.displayUtils.formatQuantity(qty);

  // Essential utility methods for processing
  truncateText = (text: string | null | undefined, maxLength: number = 50): string => {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  getWorkOrderDisplay = (order: any): string => {
    if (order.WO_NBR) {
      return `WO# ${order.WO_NBR}`;
    }
    if (order.misc?.tj_po_number) {
      return order.misc.tj_po_number;
    }
    return 'N/A';
  };

  getPartDescription = (order: any): string => {
    // Priority order: FULLDESC > PT_DESC1 > PT_DESC2
    if (order.FULLDESC && order.FULLDESC.trim()) {
      return order.FULLDESC.trim();
    }
    if (order.PT_DESC1 && order.PT_DESC1.trim()) {
      return order.PT_DESC1.trim();
    }
    if (order.PT_DESC2 && order.PT_DESC2.trim()) {
      return order.PT_DESC2.trim();
    }
    return 'No description available';
  };

  getRecentComment = (order: any): string => {
    if (order.recent_comments?.comments_html) {
      // Strip HTML tags for display
      return order.recent_comments.comments_html.replace(/<[^>]*>/g, '');
    }
    if (order.recent_comments?.comments) {
      return order.recent_comments.comments.replace(/<[^>]*>/g, '');
    }
    return '';
  };

  // Check if the order has missing shipping data
  hasMissingData = (order: any): boolean => {
    return order.SOD_PART === 'MISSING_DATA' || 
           order.STATUS === 'Data Not Found' ||
           order.SO_CUST === 'MISSING_DATA' ||
           order.CUSTNAME === 'MISSING_DATA';
  };

  // Get display value with fallback for missing data
  getDisplayValue = (value: any, fallback: string = 'N/A', missingText: string = 'Data Missing'): string => {
    if (value === 'MISSING_DATA') return missingText;
    if (!value) return fallback;
    return value.toString();
  };
}

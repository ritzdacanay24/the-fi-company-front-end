import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
    private priorityDisplayService: PriorityDisplayService,
    private displayUtils: DisplayUtilsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🚀 Shipping Priority Display component initialized');
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
    
    // Setup time display
    this.setupTimeDisplay();
    
    // Setup auto-refresh
    this.setupAutoRefresh();
    
    // Load initial data
    this.loadInitialData();
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
        this.priorityDisplayService.loadPriorityData();
      });
  }

  /**
   * Load initial data
   */
  private async loadInitialData(): Promise<void> {
    try {
      console.log('🚀 Loading initial priority data...');
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
    await this.priorityDisplayService.loadPriorityData();
  }

  /**
   * Toggle between single and top3 display modes
   */
  toggleDisplayMode(): void {
    this.displayMode = this.displayMode === 'single' ? 'top3' : 'single';
    console.log(`🔄 Display mode changed to: ${this.displayMode}`);
    this.priorityDisplayService.updateDisplayMode(this.displayMode);
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
}
